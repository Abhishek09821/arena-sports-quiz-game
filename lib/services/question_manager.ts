import { type Sport, type Difficulty } from "@/data/questions";
import { generateAIQuestions } from "./ai_question_generator";
import {
  validateQuestion,
  extractQuestionStem,
  type ValidatedQuestion,
} from "./question_validator";

export interface CreateQuizRequest {
  userId?: string | null;
  sport: Sport | "All Sports";
  difficulty: Difficulty | "Mixed";
  count: number;
  mode?: "classic" | "sprint" | "challenge" | "buzzer" | "multiplayer";
  category?: string;
  excludeStems?: string[];
  excludeAnswers?: string[];
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
 * Orchestrates personalized quiz generation on-the-fly via AI.
 * ZERO DATABASE PERSISTENCE for questions: questions are dynamically synthesized
 * and never written to Supabase or any database, eliminating stale duplicate pools.
 */
export async function generatePersonalizedQuiz(params: CreateQuizRequest): Promise<QuizDeckResponse> {
  const { sport, difficulty, count, mode = "classic", category, excludeStems = [], excludeAnswers = [] } = params;

  // Map mode
  const normalizedMode: "classic" | "challenge" | "sprint" | "multiplayer" =
    mode === "buzzer" || mode === "multiplayer"
      ? "multiplayer"
      : mode === "sprint"
      ? "sprint"
      : mode === "challenge"
      ? "challenge"
      : "classic";

  const collectedQuestions: ValidatedQuestion[] = [];
  const seenRoundHashes = new Set<string>();
  const seenRoundStems = new Set<string>();
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
      mode: normalizedMode,
      excludeStems: [...excludeStems, ...Array.from(seenRoundStems)],
      excludeAnswers: [...excludeAnswers, ...collectedQuestions.map((q) => q.correctAnswerText)],
    });

    for (const raw of rawBatch) {
      if (collectedQuestions.length >= count) break;

      const validation = validateQuestion(raw, category);
      if (!validation.valid || !validation.question) {
        continue;
      }

      const validated = validation.question;

      // Duplicate checks within current round
      if (seenRoundHashes.has(validated.questionHash)) {
        continue;
      }

      const stem = extractQuestionStem(validated.question);
      if (seenRoundStems.has(stem)) {
        continue;
      }

      seenRoundHashes.add(validated.questionHash);
      seenRoundStems.add(stem);
      collectedQuestions.push(validated);
    }
  }

  // Top up if any slot remaining
  if (collectedQuestions.length < count) {
    const rawTopUp = await generateAIQuestions({
      sport,
      difficulty,
      count: count - collectedQuestions.length,
      category,
      mode: normalizedMode,
      excludeStems: [...excludeStems, ...Array.from(seenRoundStems)],
    });
    for (const raw of rawTopUp) {
      if (collectedQuestions.length >= count) break;
      const v = validateQuestion(raw, category);
      if (v.valid && v.question && !seenRoundHashes.has(v.question.questionHash)) {
        seenRoundHashes.add(v.question.questionHash);
        collectedQuestions.push(v.question);
      }
    }
  }

  // Randomize options & verify correct answer positions
  const randomizedOptionsDeck = collectedQuestions.map((q) => randomizeQuestionOptions(q));

  // Randomize question order
  const finalDeck = shuffleArray(randomizedOptionsDeck);

  // Generate lightweight session identifier (no DB writes for questions)
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    sessionId,
    questions: finalDeck,
    sport,
    difficulty,
    mode,
  };
}

