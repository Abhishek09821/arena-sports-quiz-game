/* ═══════════════════════════════════════════════════════════════
   ARENA — Import Validation
   Validates questions from JSON/CSV for challenge and admin use.
   ═══════════════════════════════════════════════════════════════ */

import { SPORT_LIST, DIFFICULTY_LIST, type Question, type Sport, type Difficulty } from "@/data/questions";
import { normalizeQuestionText, questionHash } from "@/lib/quiz";

export interface ValidationError {
  index: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  questions: Question[];
  errors: ValidationError[];
  duplicates: number[];
}

const validSports = new Set<string>(SPORT_LIST);
const validDifficulties = new Set<string>(DIFFICULTY_LIST);

/**
 * Validate and normalize an array of raw question objects.
 */
export function validateQuestions(
  data: unknown[],
  options: { exactCount?: number; checkDuplicates?: boolean } = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const questions: Question[] = [];
  const duplicates: number[] = [];
  const seenHashes = new Set<string>();

  if (!Array.isArray(data)) {
    return { valid: false, questions: [], errors: [{ index: -1, field: "root", message: "Input must be an array." }], duplicates: [] };
  }

  if (options.exactCount && data.length !== options.exactCount) {
    errors.push({
      index: -1,
      field: "count",
      message: `Expected exactly ${options.exactCount} questions, got ${data.length}.`,
    });
  }

  for (let i = 0; i < data.length; i++) {
    const raw = data[i] as Record<string, unknown>;

    // Question text
    if (!raw.question || typeof raw.question !== "string" || raw.question.trim().length === 0) {
      errors.push({ index: i, field: "question", message: "Question text is required." });
      continue;
    }

    // Options
    if (!Array.isArray(raw.options) || raw.options.length !== 4) {
      errors.push({ index: i, field: "options", message: "Exactly 4 options are required." });
      continue;
    }

    const opts = raw.options.map((o) => String(o).trim()) as [string, string, string, string];
    if (opts.some((o) => o.length === 0)) {
      errors.push({ index: i, field: "options", message: "Options cannot be empty." });
      continue;
    }

    // Check duplicate options
    const uniqueOpts = new Set(opts.map((o) => normalizeQuestionText(o)));
    if (uniqueOpts.size !== 4) {
      errors.push({ index: i, field: "options", message: "All 4 options must be different." });
      continue;
    }

    // Answer index
    const answer = Number(raw.answer);
    if (isNaN(answer) || answer < 0 || answer > 3 || !Number.isInteger(answer)) {
      errors.push({ index: i, field: "answer", message: "Answer must be an integer from 0 to 3." });
      continue;
    }

    // Sport
    const sport = String(raw.sport || "Cricket").trim();
    if (!validSports.has(sport)) {
      errors.push({ index: i, field: "sport", message: `Invalid sport "${sport}". Must be one of: ${SPORT_LIST.join(", ")}.` });
      continue;
    }

    // Difficulty
    const difficulty = String(raw.difficulty || "Medium").trim();
    if (!validDifficulties.has(difficulty)) {
      errors.push({ index: i, field: "difficulty", message: `Invalid difficulty "${difficulty}". Must be one of: ${DIFFICULTY_LIST.join(", ")}.` });
      continue;
    }

    // Duplicate detection
    if (options.checkDuplicates !== false) {
      const hash = questionHash(raw.question as string, opts);
      if (seenHashes.has(hash)) {
        duplicates.push(i);
        errors.push({ index: i, field: "question", message: "Duplicate question detected." });
        continue;
      }
      seenHashes.add(hash);
    }

    questions.push({
      id: String(raw.id || `import-${Date.now()}-${i}`),
      sport: sport as Sport,
      year: Number(raw.year) || 2026,
      difficulty: difficulty as Difficulty,
      question: String(raw.question).trim(),
      options: opts,
      answer,
      explanation: String(raw.explanation || ""),
      source: typeof raw.source === "string" ? raw.source : undefined,
    });
  }

  return {
    valid: errors.length === 0 && (options.exactCount ? questions.length === options.exactCount : questions.length > 0),
    questions,
    errors,
    duplicates,
  };
}

/**
 * Parse CSV text into question objects.
 * Expected columns: question,option_a,option_b,option_c,option_d,answer,sport,difficulty,year,explanation
 */
export function parseCSV(text: string): unknown[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const results: unknown[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? "";
    });

    // Map CSV columns to question format
    results.push({
      question: row.question,
      options: [row.option_a, row.option_b, row.option_c, row.option_d],
      answer: Number(row.answer) || 0,
      sport: row.sport || "Cricket",
      difficulty: row.difficulty || "Medium",
      year: Number(row.year) || 2026,
      explanation: row.explanation || "",
    });
  }

  return results;
}

/** Simple CSV line parser that handles quoted values */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}
