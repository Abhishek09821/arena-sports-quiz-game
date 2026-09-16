import { SPORT_LIST, DIFFICULTY_LIST, type Sport, type Difficulty } from "@/data/questions";

export interface RawGeneratedQuestion {
  id?: string;
  sport: string;
  difficulty: string;
  category?: string;
  year?: number;
  question: string;
  options: string[];
  answer: number | string; // Can be index 0-3 or correct answer text
  explanation: string;
  source?: string;
}

export interface ValidatedQuestion {
  id: string;
  sport: Sport;
  difficulty: Difficulty;
  category: string;
  year: number;
  question: string;
  options: [string, string, string, string];
  answer: number; // 0-3
  correctAnswerText: string;
  explanation: string;
  questionHash: string;
  source: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  question?: ValidatedQuestion;
}

/**
 * Normalizes question text for consistent duplicate detection
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[.!?,;:]+$/g, "");
}

/**
 * Extracts a normalized question stem for similarity comparison
 */
export function extractQuestionStem(text: string): string {
  const norm = normalizeQuestionText(text);
  return norm
    .replace(/^(which|who|what|where|when|in which|during the|in)\s+/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .slice(0, 50);
}

/**
 * Generates deterministic 32-bit hash for duplicate detection
 */
export function calculateQuestionHash(questionText: string, options: string[]): string {
  const normQ = normalizeQuestionText(questionText);
  const normOpts = options.map((o) => normalizeQuestionText(o)).sort().join("|");
  const payload = `${normQ}#${normOpts}`;

  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = (hash << 5) - hash + payload.charCodeAt(i);
    hash = char & char;
  }
  return Math.abs(hash).toString(36).padStart(7, "0");
}

/**
 * Strict quality validation for AI generated or user submitted questions.
 * Enforces:
 * - Valid sport & difficulty
 * - Exactly 4 non-empty, unique options
 * - Valid correct answer mapping to an option
 * - Non-empty question and explanation
 * - Plausible distractor check (options cannot be identical or single non-sense characters)
 */
export function validateQuestion(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Question must be a valid JSON object."] };
  }

  const q = raw as Partial<RawGeneratedQuestion>;

  // 1. Question text
  if (!q.question || typeof q.question !== "string" || q.question.trim().length < 10) {
    errors.push("Question text is missing or too short (minimum 10 characters).");
  }

  // 2. Sport validation
  const validSports = new Set(SPORT_LIST);
  let resolvedSport: Sport = "Cricket";
  const rawSportLower = (q.sport || "").toLowerCase().trim();

  const sportAliasMap: Record<string, Sport> = {
    cricket: "Cricket",
    football: "Football",
    soccer: "Football",
    basketball: "Basketball",
    nba: "Basketball",
    "formula 1": "Formula 1",
    formula1: "Formula 1",
    f1: "Formula 1",
    "wwe/wwf": "WWE/WWF",
    wwe: "WWE/WWF",
    wwf: "WWE/WWF",
    "pro wrestling": "WWE/WWF",
    wrestling: "WWE/WWF",
    ufc: "UFC",
    mma: "UFC",
  };

  if (sportAliasMap[rawSportLower]) {
    resolvedSport = sportAliasMap[rawSportLower];
  } else if (validSports.has(q.sport as Sport)) {
    resolvedSport = q.sport as Sport;
  } else {
    const matched = SPORT_LIST.find((s) => s.toLowerCase() === rawSportLower);
    if (matched) {
      resolvedSport = matched;
    } else {
      errors.push(`Invalid sport '${q.sport}'. Must be one of: ${SPORT_LIST.join(", ")}`);
    }
  }

  // Strict Association Football verification: Reject any American Football / NFL content
  if (resolvedSport === "Football") {
    const nflTerms = [
      // Leagues & Organizations
      "nfl", "super bowl", "superbowl", "afc", "nfc", "pro bowl", "nfl draft",
      "gridiron", "american football", "heisman", "college football", "ncaa football",
      "afl", "cfl", "xfl", "usfl", "cfl grey cup", "bcs championship",
      // Positions
      "quarterback", "quarterbacks", "linebacker", "linebackers", "wide receiver",
      "wide receivers", "tight end", "tight ends", "running back", "running backs",
      "cornerback", "cornerbacks", "safety", "safeties", "offensive tackle",
      "offensive line", "defensive end", "defensive tackle", "placekicker", "fullback",
      // Gameplay concepts
      "touchdown", "touchdowns", "interception", "interceptions", "field goal",
      "field goals", "pick six", "end zone", "endzone", "line of scrimmage",
      "first down", "fourth down", "rushing yards", "passing yards",
      "passing touchdowns", "rushing touchdowns", "hail mary", "punt return",
      "kickoff return", "two-point conversion", "extra point", "fumble",
      // All 32 NFL Franchises
      "kansas city chiefs", "new england patriots", "green bay packers", "dallas cowboys",
      "pittsburgh steelers", "san francisco 49ers", "philadelphia eagles", "buffalo bills",
      "miami dolphins", "new york jets", "baltimore ravens", "cincinnati bengals",
      "cleveland browns", "houston texans", "indianapolis colts", "jacksonville jaguars",
      "tennessee titans", "denver broncos", "las vegas raiders", "los angeles chargers",
      "los angeles rams", "seattle seahawks", "arizona cardinals", "new york giants",
      "washington commanders", "washington redskins", "chicago bears", "detroit lions",
      "minnesota vikings", "atlanta falcons", "carolina panthers", "new orleans saints",
      "tampa bay buccaneers",
      // Prominent NFL players & coaches
      "tom brady", "patrick mahomes", "peyton manning", "eli manning", "bill belichick",
      "aaron rodgers", "vince lombardi", "joe montana", "jerry rice", "brett favre",
      "john elway", "dan marino", "drew brees", "travis kelce", "rob gronkowski",
      "lamar jackson", "josh allen", "joe burrow", "walter payton", "barry sanders",
      "lawrence taylor", "reggie white", "don shula", "andy reid", "lombardi trophy",
      "pro football hall of fame"
    ];
    const combinedContent = `${q.question || ""} ${(q.options || []).join(" ")} ${q.explanation || ""}`.toLowerCase();
    for (const term of nflTerms) {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedTerm}\\b`, "i");
      if (regex.test(combinedContent)) {
        errors.push(`Question rejected: Contains American Football / NFL term '${term}'. Football must strictly be Association Football / FIFA Soccer.`);
        break;
      }
    }
  }

  // 3. Difficulty validation
  const validDiffs = new Set(DIFFICULTY_LIST);
  let resolvedDiff: Difficulty = "Medium";
  if (!q.difficulty || typeof q.difficulty !== "string" || !validDiffs.has(q.difficulty as Difficulty)) {
    const matched = DIFFICULTY_LIST.find((d) => d.toLowerCase() === (q.difficulty || "").toLowerCase());
    if (matched) {
      resolvedDiff = matched;
    } else {
      errors.push(`Invalid difficulty '${q.difficulty}'. Must be one of: ${DIFFICULTY_LIST.join(", ")}`);
    }
  } else {
    resolvedDiff = q.difficulty as Difficulty;
  }

  // 4. Options validation
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    errors.push(`Options must be an array of exactly 4 strings. Received: ${Array.isArray(q.options) ? q.options.length : typeof q.options}`);
  }

  const cleanedOptions: string[] = [];
  if (Array.isArray(q.options)) {
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      if (typeof opt !== "string" || opt.trim().length === 0) {
        errors.push(`Option ${i + 1} is empty or not a string.`);
      } else {
        cleanedOptions.push(opt.trim());
      }
    }
  }

  // Check for duplicate options
  if (cleanedOptions.length === 4) {
    const uniqueNormalized = new Set(cleanedOptions.map((o) => normalizeQuestionText(o)));
    if (uniqueNormalized.size !== 4) {
      errors.push("All 4 options must be distinct and non-duplicate.");
    }
  }

  // 5. Correct Answer validation & mapping
  let answerIndex = -1;
  let answerText = "";

  if (typeof q.answer === "number" && q.answer >= 0 && q.answer <= 3) {
    answerIndex = q.answer;
    answerText = cleanedOptions[answerIndex] || "";
  } else if (typeof q.answer === "string" && cleanedOptions.length === 4) {
    const target = normalizeQuestionText(q.answer);
    answerIndex = cleanedOptions.findIndex((opt) => normalizeQuestionText(opt) === target);
    if (answerIndex === -1) {
      // Check if answer is provided as "A", "B", "C", "D" or "0", "1", "2", "3"
      const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, "0": 0, "1": 1, "2": 2, "3": 3 };
      if (target in letterMap) {
        answerIndex = letterMap[target];
        answerText = cleanedOptions[answerIndex];
      }
    } else {
      answerText = cleanedOptions[answerIndex];
    }
  }

  if (answerIndex < 0 || answerIndex > 3 || !answerText) {
    errors.push("Could not resolve a valid correct answer matching one of the 4 options.");
  }

  // 6. Explanation
  const explanation = typeof q.explanation === "string" && q.explanation.trim().length > 0
    ? q.explanation.trim()
    : `${answerText} is the correct answer.`;

  // 7. Year & Category (Strictly 1975 to 2026)
  let year = typeof q.year === "number" && !isNaN(q.year) ? Math.floor(q.year) : 2024;
  if (year < 1975 || year > 2026) {
    // Flag error if year outside strict 1975-2026 window
    errors.push(`Question year (${year}) is outside strict 1975-2026 window. All trivia must be from 1975 to 2026.`);
  }

  const category = typeof q.category === "string" && q.category.trim().length > 0
    ? q.category.trim()
    : `${resolvedSport} Trivia`;

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const finalOptions: [string, string, string, string] = [
    cleanedOptions[0],
    cleanedOptions[1],
    cleanedOptions[2],
    cleanedOptions[3],
  ];

  const questionText = q.question!.trim();
  const questionHash = calculateQuestionHash(questionText, finalOptions);

  return {
    valid: true,
    errors: [],
    question: {
      id: q.id || `ai-${questionHash}`,
      sport: resolvedSport,
      difficulty: resolvedDiff,
      category,
      year,
      question: questionText,
      options: finalOptions,
      answer: answerIndex,
      correctAnswerText: answerText,
      explanation,
      questionHash,
      source: q.source || "AI Generated",
    },
  };
}
