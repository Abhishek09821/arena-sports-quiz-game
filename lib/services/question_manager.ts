import { type Sport, type Difficulty } from "@/data/questions";
import { generateAIQuestions } from "./ai_question_generator";
import {
  validateQuestion,
  type ValidatedQuestion,
  normalizeQuestionText,
} from "./question_validator";
import {
  auditCandidateQuestion,
  auditDeck,
  type DeckAuditContext,
} from "./deck_auditor";

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
  const targetAnsNorm = normalizeQuestionText(q.correctAnswerText);
  
  let newAnswerIndex = newOptions.findIndex((opt) => normalizeQuestionText(opt) === targetAnsNorm);

  // Fallback direct match if whitespace normalization differed
  if (newAnswerIndex === -1) {
    newAnswerIndex = newOptions.findIndex((opt) => opt.trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase());
  }

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
 * 
 * Incorporates Strict Self-Auditing & Quality Gates:
 * - 0 intra-deck duplicate questions or duplicate answers
 * - 0 repeats against user historical seen questions (up to 1000 unique questions over 100 games)
 * - 100% tournament & difficulty compliance
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

  const auditContext: DeckAuditContext = {
    sport,
    difficulty,
    category,
    excludeStems,
    excludeAnswers,
  };

  const collectedQuestions: ValidatedQuestion[] = [];
  const seenRoundStems = new Set<string>();
  const seenRoundAnswers = new Set<string>();
  let attempts = 0;
  const maxAttempts = 5;

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
      excludeAnswers: [...excludeAnswers, ...Array.from(seenRoundAnswers)],
    });

    for (const raw of rawBatch) {
      if (collectedQuestions.length >= count) break;

      const validation = validateQuestion(raw, category);
      if (!validation.valid || !validation.question) {
        continue;
      }

      const validated = validation.question;

      // Strict Deck Audit against current deck, past games, and tournament rules
      const audit = auditCandidateQuestion(validated, collectedQuestions, auditContext);
      if (!audit.passed) {
        continue;
      }

      seenRoundStems.add(validated.question.slice(0, 45));
      seenRoundAnswers.add(validated.correctAnswerText);
      collectedQuestions.push(validated);
    }
  }

  // Top up if any slot remaining after main loop
  let topUpAttempts = 0;
  while (collectedQuestions.length < count && topUpAttempts < 3) {
    topUpAttempts++;
    const rawTopUp = await generateAIQuestions({
      sport,
      difficulty,
      count: count - collectedQuestions.length,
      category,
      mode: normalizedMode,
      excludeStems: [...excludeStems, ...Array.from(seenRoundStems)],
      excludeAnswers: [...excludeAnswers, ...Array.from(seenRoundAnswers)],
    });

    for (const raw of rawTopUp) {
      if (collectedQuestions.length >= count) break;
      const v = validateQuestion(raw, category);
      if (v.valid && v.question) {
        const audit = auditCandidateQuestion(v.question, collectedQuestions, auditContext);
        if (audit.passed) {
          seenRoundStems.add(v.question.question.slice(0, 45));
          seenRoundAnswers.add(v.question.correctAnswerText);
          collectedQuestions.push(v.question);
        }
      }
    }
  }

  // Final Quality Seal: Audit the entire compiled deck
  const finalAudit = auditDeck(collectedQuestions, auditContext, count);
  const certifiedDeck = finalAudit.validQuestions;

  // Randomize options & verify correct answer positions
  const randomizedOptionsDeck = certifiedDeck.map((q) => randomizeQuestionOptions(q));

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
