/* ═══════════════════════════════════════════════════════════════
   ARENA — Core Logic & AI Quiz Pipeline Tests
   Tests for scoring, timer, AI validation, randomization,
   answer mapping, duplicate detection, and import parsing.
   ═══════════════════════════════════════════════════════════════ */

import { scoreAnswer, getTimeLimit } from "../lib/scoring";
import { shuffle, shuffleQuestionOptions, buildGame } from "../lib/quiz";
import {
  validateQuestion,
  normalizeQuestionText,
  extractQuestionStem,
  calculateQuestionHash,
} from "../lib/services/question_validator";
import { randomizeQuestionOptions } from "../lib/services/question_manager";
import { validateQuestions, parseCSV } from "../lib/validation";
import { SPORT_LIST, DIFFICULTY_LIST } from "../data/questions";

// ── Test Runner ────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`${name}: ${msg}`);
    console.error(`  ✗ ${name}: ${msg}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 1. SCORING TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── Scoring Engine ──────────────────────────");

test("correct Easy answer gives base 100", () => {
  const result = scoreAnswer("Easy", 20, true, 0);
  assertEqual(result.base, 100);
  assert(result.total >= 100, "Total should be >= 100");
});

test("correct Legendary answer gives base 350", () => {
  const result = scoreAnswer("Legendary", 10, true, 0);
  assertEqual(result.base, 350);
});

test("wrong answer gives 0 points", () => {
  const result = scoreAnswer("Hard", 15, false, 5);
  assertEqual(result.total, 0);
  assertEqual(result.base, 0);
  assertEqual(result.speedBonus, 0);
  assertEqual(result.streakBonus, 0);
});

test("speed bonus increases with time left", () => {
  const fast = scoreAnswer("Medium", 20, true, 0);
  const slow = scoreAnswer("Medium", 5, true, 0);
  assert(fast.speedBonus > slow.speedBonus, "Fast answer should get more speed bonus");
});

test("streak bonus increases with streak count", () => {
  const noStreak = scoreAnswer("Medium", 15, true, 0);
  const streak5 = scoreAnswer("Medium", 15, true, 5);
  assert(streak5.total > noStreak.total, "Streak 5 should give more points than no streak");
});

test("streak bonus is capped at 200", () => {
  const result = scoreAnswer("Easy", 15, true, 100);
  assertEqual(result.streakBonus, 200);
});

test("speed bonus is 0 when no time left", () => {
  const result = scoreAnswer("Easy", 0, true, 0);
  assertEqual(result.speedBonus, 0);
});

test("score is deterministic", () => {
  const a = scoreAnswer("Hard", 12, true, 3);
  const b = scoreAnswer("Hard", 12, true, 3);
  assertEqual(a.total, b.total);
  assertEqual(a.base, b.base);
  assertEqual(a.speedBonus, b.speedBonus);
  assertEqual(a.streakBonus, b.streakBonus);
});

// ═══════════════════════════════════════════════════════════
// 2. TIMER TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── Timer ───────────────────────────────────");

test("Easy gives 30 seconds", () => {
  assertEqual(getTimeLimit("Easy"), 30);
});

test("Medium gives 25 seconds", () => {
  assertEqual(getTimeLimit("Medium"), 25);
});

test("Hard gives 20 seconds", () => {
  assertEqual(getTimeLimit("Hard"), 20);
});

test("Legendary gives 16 seconds", () => {
  assertEqual(getTimeLimit("Legendary"), 16);
});

test("all difficulties have time limits", () => {
  for (const diff of DIFFICULTY_LIST) {
    const limit = getTimeLimit(diff);
    assert(limit > 0 && limit <= 60, `${diff} limit out of range: ${limit}`);
  }
});

// ═══════════════════════════════════════════════════════════
// 3. AI QUESTION VALIDATION TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── AI Question Validation ──────────────────");

test("valid question passes validation", () => {
  const valid = {
    sport: "Cricket",
    difficulty: "Medium",
    question: "Who won the 2011 ICC Cricket World Cup?",
    options: ["India", "Sri Lanka", "Australia", "England"],
    answer: "India",
    explanation: "India defeated Sri Lanka in the final at Wankhede Stadium.",
  };
  const res = validateQuestion(valid);
  assert(res.valid, `Expected valid question, got errors: ${res.errors.join(", ")}`);
  assertEqual(res.question?.answer, 0);
  assertEqual(res.question?.correctAnswerText, "India");
});

test("rejects question with missing or short question text", () => {
  const invalid = {
    sport: "Football",
    difficulty: "Easy",
    question: "Short?",
    options: ["A", "B", "C", "D"],
    answer: 0,
    explanation: "Exp",
  };
  const res = validateQuestion(invalid);
  assert(!res.valid, "Should reject too short question");
});

test("rejects question with non-array options", () => {
  const invalid = {
    sport: "Tennis",
    difficulty: "Easy",
    question: "Who won Wimbledon in 2023?",
    options: "Invalid String",
    answer: 0,
    explanation: "Exp",
  };
  const res = validateQuestion(invalid);
  assert(!res.valid, "Should reject string options");
});

test("rejects question with 3 options instead of 4", () => {
  const invalid = {
    sport: "Tennis",
    difficulty: "Easy",
    question: "Who won Wimbledon in 2023?",
    options: ["Alcaraz", "Djokovic", "Medvedev"],
    answer: 0,
    explanation: "Exp",
  };
  const res = validateQuestion(invalid);
  assert(!res.valid, "Should reject 3 options");
});

test("rejects question with duplicate options", () => {
  const invalid = {
    sport: "Basketball",
    difficulty: "Easy",
    question: "Which player scored 100 points in an NBA game?",
    options: ["Wilt Chamberlain", "Michael Jordan", "Wilt Chamberlain", "Kobe Bryant"],
    answer: 0,
    explanation: "Exp",
  };
  const res = validateQuestion(invalid);
  assert(!res.valid, "Should reject duplicate options");
});

test("rejects invalid sport", () => {
  const invalid = {
    sport: "Quidditch",
    difficulty: "Easy",
    question: "Who caught the golden snitch in 1994?",
    options: ["Harry", "Cedric", "Krum", "Draco"],
    answer: 0,
    explanation: "Exp",
  };
  const res = validateQuestion(invalid);
  assert(!res.valid, "Should reject invalid sport");
});

test("rejects American Football / NFL questions under Football sport category", () => {
  const nflQuestion = {
    sport: "Football",
    difficulty: "Medium",
    question: "Which quarterback has won the most Super Bowl titles in NFL history?",
    options: ["Tom Brady", "Joe Montana", "Patrick Mahomes", "Peyton Manning"],
    answer: "Tom Brady",
    explanation: "Tom Brady won seven Super Bowl titles.",
  };
  const res = validateQuestion(nflQuestion);
  assert(!res.valid, "Must reject NFL question in Football category");
  assert(res.errors.some((e) => e.includes("American Football / NFL")), "Must flag NFL error message");
});

test("accepts valid FIFA soccer questions under Football sport category", () => {
  const soccerQuestion = {
    sport: "Football",
    difficulty: "Easy",
    question: "Which country won the 2022 FIFA World Cup in Qatar?",
    options: ["Argentina", "France", "Croatia", "Morocco"],
    answer: "Argentina",
    explanation: "Argentina defeated France in the final.",
  };
  const res = validateQuestion(soccerQuestion);
  assert(res.valid, "Must accept valid FIFA soccer question");
  assertEqual(res.question?.correctAnswerText, "Argentina");
});

// ═══════════════════════════════════════════════════════════
// 4. OPTION RANDOMIZATION & ANSWER MAPPING TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── Option Randomization & Answer Mapping ───");

test("option randomization guarantees 100% correct answer mapping across 100 runs", () => {
  const sample = {
    sport: "Athletics",
    difficulty: "Easy",
    question: "What is the 100m world record set by Usain Bolt in 2009?",
    options: ["9.58 seconds", "9.63 seconds", "9.69 seconds", "9.72 seconds"],
    answer: "9.58 seconds",
    explanation: "Bolt set the record in Berlin.",
  };

  const valRes = validateQuestion(sample);
  assert(Boolean(valRes.valid && valRes.question), "Validation failed");
  const baseQ = valRes.question!;

  const observedPositions = new Set<number>();

  for (let i = 0; i < 100; i++) {
    const randomized = randomizeQuestionOptions(baseQ);
    assertEqual(randomized.options[randomized.answer], baseQ.correctAnswerText, "Answer text must match option at new answer index");
    assertEqual(randomized.options.length, 4, "Must maintain 4 options");
    observedPositions.add(randomized.answer);
  }

  assert(observedPositions.size > 1, "Randomization should distribute answers across multiple positions");
});

// ═══════════════════════════════════════════════════════════
// 5. DUPLICATE DETECTION & HASHING TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── Duplicate Detection ─────────────────────");

test("normalizeQuestionText normalizes punctuation, quotes, and whitespace", () => {
  const raw = '  Which  Country   won  "The" 2022 World Cup??  ';
  const norm = normalizeQuestionText(raw);
  assertEqual(norm, 'which country won "the" 2022 world cup');
});

test("extractQuestionStem extracts the core topic", () => {
  const q1 = "Which player won the 2011 ICC Cricket World Cup Player of the Tournament?";
  const stem = extractQuestionStem(q1);
  assert(stem.includes("player won the 2011 icc cricket world cup"), `Unexpected stem: ${stem}`);
});

test("calculateQuestionHash produces consistent and distinct hashes", () => {
  const hash1 = calculateQuestionHash("Who won the 2022 FIFA World Cup?", ["Argentina", "France", "Croatia", "Morocco"]);
  const hash2 = calculateQuestionHash("Who won the 2022 FIFA World Cup?", ["France", "Argentina", "Croatia", "Morocco"]);
  const hash3 = calculateQuestionHash("Who won the 1998 FIFA World Cup?", ["France", "Brazil", "Croatia", "Netherlands"]);

  assertEqual(hash1, hash2, "Shuffled options should produce the same hash");
  assert(hash1 !== hash3, "Different questions should produce different hashes");
});

// ═══════════════════════════════════════════════════════════
// 6. CSV & JSON PARSING TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── CSV & JSON Parsing ──────────────────────");

test("parseCSV parses basic CSV rows", () => {
  const csv = `question,option_a,option_b,option_c,option_d,answer,sport,difficulty,year,explanation
Who won the 1992 World Cup?,Australia,Pakistan,England,South Africa,1,Cricket,Easy,1992,Pakistan defeated England`;
  const result = parseCSV(csv);
  assertEqual(result.length, 1);
  assertEqual((result[0] as { question: string }).question, "Who won the 1992 World Cup?");
});

test("validateQuestions validates parsed dataset", () => {
  const raw = [
    {
      question: "Who won the 2011 Cricket World Cup?",
      options: ["India", "Sri Lanka", "Australia", "England"],
      answer: 0,
      sport: "Cricket",
      difficulty: "Easy",
      year: 2011,
      explanation: "India won in Mumbai.",
    },
  ];
  const res = validateQuestions(raw);
  assert(res.valid, "Should validate parsed set");
  assertEqual(res.questions.length, 1);
});

// ═══════════════════════════════════════════════════════════
// 7. BUILD GAME / FALLBACK SYNC GENERATOR
// ═══════════════════════════════════════════════════════════
console.log("\n── Fallback Sync Game Engine ───────────────");

test("buildGame returns requested count with randomized options", () => {
  const game = buildGame({ count: 10 });
  assertEqual(game.length, 10);
  for (const q of game) {
    assertEqual(q.options.length, 4);
    assert(q.answer >= 0 && q.answer <= 3, "Answer index must be between 0 and 3");
  }
});

// ═══════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (errors.length > 0) {
  console.log("\nFailed tests:");
  errors.forEach((e) => console.log(`  ✗ ${e}`));
}
console.log("═══════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);
