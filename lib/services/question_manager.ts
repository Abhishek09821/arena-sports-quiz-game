import { type Sport, type Difficulty, DECADE_OPTIONS, SPORT_LIST, DIFFICULTY_LIST, IDOL_BY_SPORT, TOURNAMENTS_BY_SPORT, type DecadeOption } from "@/data/questions";
import { generateAIQuestions, reviewAIQuestions } from "./ai_question_generator";
import {
  validateQuestion,
  type ValidatedQuestion,
  type RawGeneratedQuestion,
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
  mode?: "classic" | "sprint" | "challenge" | "buzzer" | "multiplayer" | "idol";
  category?: string;
  excludeStems?: string[];
  excludeAnswers?: string[];
  decade?: DecadeOption;
  idol?: string;
  candidates?: RawGeneratedQuestion[];
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

/** Selection checks, independent review, bounded replacement and final deck audit. */
export async function generatePersonalizedQuiz(params: CreateQuizRequest, services = { generate: generateAIQuestions, review: reviewAIQuestions }): Promise<QuizDeckResponse> {
  const { sport, difficulty, count, mode = "classic", category, decade, idol } = params;
  if (sport !== "All Sports" && !SPORT_LIST.includes(sport)) throw new Error("Choose a supported sport.");
  if (difficulty !== "Mixed" && !DIFFICULTY_LIST.includes(difficulty)) throw new Error("Choose a supported difficulty.");
  if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error("Choose between 1 and 30 questions.");
  if (mode === "idol" && (sport === "All Sports" || !IDOL_BY_SPORT[sport]?.some(p => p.name === idol))) {
    throw new Error("Choose an idol from the selected sport.");
  }
  if (category && (sport === "All Sports" || !TOURNAMENTS_BY_SPORT[sport].includes(category))) throw new Error("Choose a tournament from the selected sport.");
  const decadeOption = DECADE_OPTIONS.find(d => d.value === decade);
  if (decade && !decadeOption) throw new Error("Choose a valid decade.");
  const decadeRange: [number, number] | undefined = decade && decade !== "all" && decadeOption ? [...decadeOption.range] : undefined;
  const excludeStems = (params.excludeStems || []).filter((s): s is string => typeof s === "string");
  const context: DeckAuditContext = { sport, difficulty, category, idol, excludeStems };
  const accepted: ValidatedQuestion[] = [];
  const rejected: string[] = [];
  const deadline = Date.now() + 90000;
  const normalizedMode = mode === "buzzer" ? "multiplayer" : mode;
  // Fixed difficulty slots stop a Mixed deck from silently becoming ten easy questions.
  const slots: Difficulty[] = Array.from({ length: count }, (_, i) => difficulty === "Mixed" ? (["Medium", "Hard", "Easy"] as const)[i % 3] : difficulty);
  for (let attempt = 0; attempt < 5 && accepted.length < count; attempt++) {
    const remaining = [...slots];
    for (const q of accepted) remaining.splice(remaining.indexOf(q.difficulty), 1);
    for (const target of [...new Set(remaining)]) {
      const needed = remaining.filter(d => d === target).length;
      const options = { deadline, sport, difficulty: target, count: needed, category, decade, idol, mode: normalizedMode, excludeStems: [...excludeStems, ...accepted.map(q => q.question), ...rejected] };
      const raw = attempt === 0 && params.candidates ? params.candidates.filter(q => q?.difficulty === target) : await services.generate(options);
      const candidates = raw.filter(q => {
        const result = validateQuestion(q, category, target, decadeRange);
        const ok = Number.isInteger(q?.year) && typeof q?.explanation === "string" && q.explanation.trim().length > 0 && result.valid && result.question && auditCandidateQuestion(result.question, accepted, context).passed;
        if (!ok && typeof q?.question === "string") rejected.push(q.question);
        return ok;
      });
      const reviewed = await services.review(options, candidates);
      const approved = new Set(reviewed.map(q => JSON.stringify(q)));
      let filled = 0;
      for (const candidate of candidates) {
        if (!approved.has(JSON.stringify(candidate))) { rejected.push(candidate.question); continue; }
        if (filled >= needed) break;
        const result = validateQuestion(candidate, category, target, decadeRange);
        if (result.question && auditCandidateQuestion(result.question, accepted, context).passed) {
          accepted.push(result.question);
          filled++;
        } else rejected.push(candidate.question);
      }
    }
  }
  const audit = auditDeck(accepted, context, count);
  if (!audit.passed) throw new Error(`Could not assemble ${count} fresh questions matching your selection after quality checks. Please retry or choose a different topic.`);
  return { sessionId: `session-${crypto.randomUUID()}`, questions: shuffleArray(audit.validQuestions.map(randomizeQuestionOptions)), sport, difficulty, mode };
}
