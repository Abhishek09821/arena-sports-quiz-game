import { ValidatedQuestion, extractQuestionStem, normalizeQuestionText } from "./question_validator";
import { type Difficulty, type Sport } from "@/data/questions";

export interface DeckAuditContext {
  sport: Sport | "All Sports";
  difficulty: Difficulty | "Mixed";
  category?: string;
  excludeStems?: string[];
  excludeAnswers?: string[];
}

export interface QuestionAuditResult {
  passed: boolean;
  reasons: string[];
}

export interface DeckAuditReport {
  passed: boolean;
  validQuestions: ValidatedQuestion[];
  rejectedQuestions: Array<{ question: ValidatedQuestion; reasons: string[] }>;
}

/**
 * Fuzzy canonical comparison helper
 */
function canonicalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/^(which|who|what|where|when|in which|during the|in the|in|at the|at)\s+/i, "")
    .replace(/^(indian premier league|ipl|uefa champions league|champions league|fifa world cup|world cup|premier league|la liga|wrestlemania|royal rumble|summerslam|formula 1|f1|nba finals|nba)\s*,?\s*/i, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 45);
}

/**
 * Strict Quality & Uniqueness Auditor for an individual candidate question within a deck.
 */
export function auditCandidateQuestion(
  q: ValidatedQuestion,
  currentDeck: ValidatedQuestion[],
  context: DeckAuditContext
): QuestionAuditResult {
  const reasons: string[] = [];

  // 1. Minimum content check
  if (!q.question || q.question.trim().length < 15) {
    reasons.push("Question text is suspiciously short (<15 characters).");
  }

  // 2. Intra-deck Question Stem Uniqueness
  const candidateStem = canonicalizeText(q.question);
  for (const existing of currentDeck) {
    const existingStem = canonicalizeText(existing.question);
    if (candidateStem && existingStem && (candidateStem === existingStem || candidateStem.includes(existingStem) || existingStem.includes(candidateStem))) {
      reasons.push(`Duplicate or near-identical question stem to already accepted question: "${existing.question}"`);
      break;
    }
  }

  // 3. Intra-deck Answer Text Uniqueness (Zero duplicate answer heroes/teams within a single 10-pack)
  const candidateAnswerNorm = normalizeQuestionText(q.correctAnswerText);
  for (const existing of currentDeck) {
    const existingAnsNorm = normalizeQuestionText(existing.correctAnswerText);
    if (candidateAnswerNorm && existingAnsNorm && candidateAnswerNorm === existingAnsNorm) {
      reasons.push(`Duplicate correct answer "${q.correctAnswerText}" already used by another question in this deck.`);
      break;
    }
  }

  // 4. Cross-Game Historical Exclusions (Zero Repeat Guarantee across user sessions)
  if (context.excludeStems && context.excludeStems.length > 0) {
    for (const rawExcluded of context.excludeStems) {
      const canonEx = canonicalizeText(rawExcluded);
      if (canonEx && candidateStem && (candidateStem === canonEx || candidateStem.startsWith(canonEx) || canonEx.startsWith(candidateStem))) {
        reasons.push(`Question matches a previously seen question from past sessions: "${rawExcluded.slice(0, 50)}"`);
        break;
      }
    }
  }

  if (context.excludeAnswers && context.excludeAnswers.length > 0) {
    for (const rawAns of context.excludeAnswers) {
      const exNorm = normalizeQuestionText(rawAns);
      if (exNorm && candidateAnswerNorm && (candidateAnswerNorm === exNorm || candidateAnswerNorm.includes(exNorm) || exNorm.includes(candidateAnswerNorm))) {
        reasons.push(`Correct answer "${q.correctAnswerText}" matches an excluded recent answer.`);
        break;
      }
    }
  }

  // 5. Options Quality Check
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    reasons.push("Options array does not contain exactly 4 options.");
  } else {
    const uniqueOptions = new Set(q.options.map((o) => normalizeQuestionText(o)));
    if (uniqueOptions.size !== 4) {
      reasons.push("Options contain duplicate choices.");
    }

    // Verify correct answer text matches exactly one option
    const matchingOptionIndex = q.options.findIndex(
      (opt) => normalizeQuestionText(opt) === candidateAnswerNorm
    );
    if (matchingOptionIndex === -1) {
      reasons.push(`Correct answer text "${q.correctAnswerText}" is not found in the 4 options.`);
    }
  }

  // 6. Tournament Specificity Check
  if (context.category && !context.category.startsWith("All") && context.category !== "All Tournaments" && context.category !== "All Events") {
    const combinedContent = `${q.question} ${q.options.join(" ")} ${q.explanation}`.toLowerCase();
    const tLower = context.category.toLowerCase();

    if (tLower.includes("ipl") || tLower.includes("indian premier league")) {
      if (/\b(world cup|ashes|champions trophy|odi series)\b/i.test(combinedContent) && !combinedContent.includes("ipl")) {
        reasons.push("Mentions foreign cricket tournaments while IPL was specified.");
      }
    } else if (tLower.includes("champions league") || tLower.includes("ucl")) {
      if (/\b(fifa world cup|euro \d{4}|copa am[eé]rica)\b/i.test(combinedContent) && !combinedContent.includes("champions league")) {
        reasons.push("Mentions foreign football competitions while UEFA Champions League was specified.");
      }
    } else if (tLower.includes("wrestlemania")) {
      if (/\b(summerslam|royal rumble|survivor series)\b/i.test(combinedContent) && !combinedContent.includes("wrestlemania")) {
        reasons.push("Mentions non-WrestleMania WWE PPVs while WrestleMania was requested.");
      }
    }
  }

  // 7. Strict Difficulty Check
  if (context.difficulty && context.difficulty !== "Mixed") {
    if (q.difficulty.toLowerCase() !== context.difficulty.toLowerCase()) {
      reasons.push(`Difficulty mismatch: Question marked as ${q.difficulty} but ${context.difficulty} was requested.`);
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Audits an entire collection of questions and filters out any duplicate, invalid, or repeating questions.
 */
export function auditDeck(
  candidates: ValidatedQuestion[],
  context: DeckAuditContext,
  targetCount: number
): DeckAuditReport {
  const validQuestions: ValidatedQuestion[] = [];
  const rejectedQuestions: Array<{ question: ValidatedQuestion; reasons: string[] }> = [];

  for (const q of candidates) {
    if (validQuestions.length >= targetCount) break;

    const audit = auditCandidateQuestion(q, validQuestions, context);
    if (audit.passed) {
      validQuestions.push(q);
    } else {
      rejectedQuestions.push({ question: q, reasons: audit.reasons });
    }
  }

  return {
    passed: validQuestions.length >= targetCount,
    validQuestions,
    rejectedQuestions,
  };
}
