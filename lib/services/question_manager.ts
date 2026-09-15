import { type Sport, type Difficulty } from "@/data/questions";
import { generateAIQuestions } from "./ai_question_generator";
import {
  validateQuestion,
  extractQuestionStem,
  type ValidatedQuestion,
} from "./question_validator";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export interface CreateQuizRequest {
  userId?: string | null;
  sport: Sport | "All Sports";
  difficulty: Difficulty | "Mixed";
  count: number;
  mode?: "classic" | "sprint" | "challenge" | "buzzer";
  category?: string;
}

export interface QuizDeckResponse {
  sessionId: string;
  questions: ValidatedQuestion[];
  sport: Sport | "All Sports";
  difficulty: Difficulty | "Mixed";
  mode: string;
}

/**
 * Fisher-Yates array shuffle helper
 */
export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Dynamically randomizes option ordering using Fisher-Yates and recalculates answer index.
 * Strictly verifies that the correct answer mapping remains 100% accurate.
 */
export function randomizeQuestionOptions(q: ValidatedQuestion): ValidatedQuestion {
  const perm = [0, 1, 2, 3];
  for (let i = perm.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }

  const newOptions = perm.map((idx) => q.options[idx]) as [string, string, string, string];
  const newAnswerIndex = newOptions.findIndex((opt) => opt === q.correctAnswerText);

  if (newAnswerIndex === -1) {
    throw new Error(`Critical: Option randomization failed to map correct answer '${q.correctAnswerText}'`);
  }

  return {
    ...q,
    options: newOptions,
    answer: newAnswerIndex,
  };
}

/**
 * Orchestrates personalized quiz generation, validation, non-repetition, and Supabase persistence.
 */
export async function generatePersonalizedQuiz(params: CreateQuizRequest): Promise<QuizDeckResponse> {
  const { userId, sport, difficulty, count, mode = "classic", category } = params;
  const adminClient = getSupabaseAdminClient();

  // 1. Fetch user's previous question history to guarantee non-repetition
  const excludeStems: string[] = [];
  const excludeAnswers: string[] = [];
  const seenHashes = new Set<string>();

  if (userId && adminClient) {
    try {
      const { data: history } = await adminClient
        .from("question_history")
        .select("question_hash, questions(question_text, correct_answer)")
        .eq("user_id", userId)
        .order("used_at", { ascending: false })
        .limit(100);

      if (history) {
        for (const row of history) {
          if (row.question_hash) seenHashes.add(row.question_hash);
          const qData = Array.isArray(row.questions) ? row.questions[0] : row.questions;
          if (qData?.question_text) {
            excludeStems.push(extractQuestionStem(qData.question_text));
          }
          if (qData?.correct_answer) {
            excludeAnswers.push(qData.correct_answer);
          }
        }
      }
    } catch (e) {
      console.warn("[Question Manager] Failed to query question history, continuing:", e);
    }
  }

  // 2. Generate questions via AI
  const collectedQuestions: ValidatedQuestion[] = [];
  const seenRoundHashes = new Set<string>();
  let attempts = 0;
  const maxAttempts = 3;

  while (collectedQuestions.length < count && attempts < maxAttempts) {
    attempts++;
    const needed = count - collectedQuestions.length;

    const rawBatch = await generateAIQuestions({
      sport,
      difficulty,
      count: needed,
      category,
      excludeStems: [...excludeStems, ...collectedQuestions.map((q) => extractQuestionStem(q.question))],
      excludeAnswers: [...excludeAnswers, ...collectedQuestions.map((q) => q.correctAnswerText)],
    });

    for (const raw of rawBatch) {
      if (collectedQuestions.length >= count) break;

      const validation = validateQuestion(raw);
      if (!validation.valid || !validation.question) {
        continue;
      }

      const validated = validation.question;

      // Duplicate check against user history and current round
      if (seenHashes.has(validated.questionHash) || seenRoundHashes.has(validated.questionHash)) {
        continue;
      }

      // Check intra-round stem collision
      const stem = extractQuestionStem(validated.question);
      const stemCollides = collectedQuestions.some((cq) => extractQuestionStem(cq.question) === stem);
      if (stemCollides) {
        continue;
      }

      seenRoundHashes.add(validated.questionHash);
      collectedQuestions.push(validated);
    }
  }

  // If still short due to strict duplicate filtering, accept remaining valid questions without history check
  if (collectedQuestions.length < count) {
    const rawTopUp = await generateAIQuestions({
      sport,
      difficulty,
      count: count - collectedQuestions.length,
      category,
    });
    for (const raw of rawTopUp) {
      if (collectedQuestions.length >= count) break;
      const v = validateQuestion(raw);
      if (v.valid && v.question && !seenRoundHashes.has(v.question.questionHash)) {
        seenRoundHashes.add(v.question.questionHash);
        collectedQuestions.push(v.question);
      }
    }
  }

  // 3. Randomize options & verify correct answer positions
  const randomizedOptionsDeck = collectedQuestions.map((q) => randomizeQuestionOptions(q));

  // 4. Randomize question order
  const finalDeck = shuffleArray(randomizedOptionsDeck);

  // 5. Persist questions & create quiz session in Supabase
  let sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (adminClient) {
    try {
      // 5a. Upsert questions into database
      const questionsToUpsert = finalDeck.map((q) => ({
        sport: q.sport,
        difficulty: q.difficulty,
        category: q.category,
        question_text: q.question,
        option_a: q.options[0],
        option_b: q.options[1],
        option_c: q.options[2],
        option_d: q.options[3],
        options: q.options,
        correct_option: q.answer,
        correct_answer: q.correctAnswerText,
        explanation: q.explanation,
        question_hash: q.questionHash,
        source_type: "ai",
        verification_status: "verified",
        active: true,
      }));

      let savedQuestions = null;
      const { data: upserted, error: qError } = await adminClient
        .from("questions")
        .upsert(questionsToUpsert, { onConflict: "question_hash" })
        .select("id, question_hash");

      if (qError) {
        const { data: inserted } = await adminClient
          .from("questions")
          .insert(questionsToUpsert)
          .select("id, question_hash");
        savedQuestions = inserted;
      } else {
        savedQuestions = upserted;
      }

      // Map generated questions to their DB UUIDs if available
      const idMap = new Map<string, string>();
      if (savedQuestions) {
        for (const sq of savedQuestions) {
          idMap.set(sq.question_hash, sq.id);
        }
      }

      for (const q of finalDeck) {
        const dbId = idMap.get(q.questionHash);
        if (dbId) q.id = dbId;
      }

      // 5b. Create quiz_sessions record
      const { data: sessionData, error: sError } = await adminClient
        .from("quiz_sessions")
        .insert({
          user_id: userId || null,
          sport: sport,
          difficulty: difficulty,
          question_count: finalDeck.length,
          mode,
          status: "in_progress",
        })
        .select("id")
        .single();

      if (sError) {
        console.warn("[Question Manager] Session insert notice:", sError.message);
      }

      if (sessionData?.id) {
        sessionId = sessionData.id;

        // 5c. Insert session questions
        const sessionQuestionRows = finalDeck.map((q, idx) => ({
          session_id: sessionId,
          question_id: q.id,
          question_order: idx + 1,
        }));

        await adminClient.from("quiz_session_questions").insert(sessionQuestionRows);

        // 5d. If logged in, record in question_history to prevent repeating in future
        if (userId) {
          const historyRows = finalDeck.map((q) => ({
            user_id: userId,
            question_id: q.id,
            session_id: sessionId,
            sport: q.sport,
            difficulty: q.difficulty,
            question_hash: q.questionHash,
          }));
          await adminClient.from("question_history").insert(historyRows);
        }
      }
    } catch (dbErr) {
      console.warn("[Question Manager] Database persistence note:", dbErr);
    }
  }

  return {
    sessionId,
    questions: finalDeck,
    sport,
    difficulty,
    mode,
  };
}
