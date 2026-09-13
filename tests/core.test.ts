/* ═══════════════════════════════════════════════════════════════
   ARENA — Core Logic Tests
   Tests for scoring, question selection, validation, timer logic
   ═══════════════════════════════════════════════════════════════ */

import { scoreAnswer, getTimeLimit, TIME_LIMITS } from "../lib/scoring";
import { buildGame, shuffle, normalizeQuestionText, questionHash, getAvailableCount, resetSessionHistory } from "../lib/quiz";
import { validateQuestions, parseCSV } from "../lib/validation";
import { QUESTIONS, SPORT_LIST, DIFFICULTY_LIST, type Difficulty } from "../data/questions";

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
// SCORING TESTS
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
// TIMER TESTS
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
    assert(TIME_LIMITS[diff] > 0, `${diff} should have a time limit`);
  }
});

// ═══════════════════════════════════════════════════════════
// QUESTION SELECTION TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── Question Selection ──────────────────────");

test("buildGame returns requested count", () => {
  resetSessionHistory();
  const game = buildGame({ count: 10 });
  assertEqual(game.length, 10);
});

test("buildGame respects sport filter", () => {
  resetSessionHistory();
  const game = buildGame({ sport: "Cricket", count: 5 });
  assert(game.every((q) => q.sport === "Cricket"), "All questions should be Cricket");
});

test("buildGame respects difficulty filter", () => {
  resetSessionHistory();
  const game = buildGame({ sport: "All Sports", difficulty: "Easy", count: 5 });
  assert(game.every((q) => q.difficulty === "Easy"), "All questions should be Easy");
});

test("buildGame never returns duplicates within a round", () => {
  resetSessionHistory();
  const game = buildGame({ count: 20 });
  const ids = game.map((q) => q.id);
  const unique = new Set(ids);
  assertEqual(unique.size, ids.length, "No duplicate IDs in a round");
});

test("buildGame excludes specified questions", () => {
  resetSessionHistory();
  const exclude = new Set([QUESTIONS[0].id, QUESTIONS[1].id]);
  const game = buildGame({ count: 10, exclude });
  assert(!game.some((q) => exclude.has(q.id)), "Excluded questions should not appear");
});

test("shuffle produces different orderings", () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = new Set<string>();
  for (let i = 0; i < 20; i++) {
    results.add(shuffle(arr).join(","));
  }
  assert(results.size > 1, "Shuffle should produce different orderings");
});

test("getAvailableCount returns correct numbers", () => {
  const total = getAvailableCount("All Sports", "Mixed");
  assertEqual(total, QUESTIONS.length);

  const cricketCount = getAvailableCount("Cricket", "Mixed");
  assert(cricketCount > 0, "Should have Cricket questions");
  assert(cricketCount < total, "Cricket should be subset of all");
});

// ═══════════════════════════════════════════════════════════
// DUPLICATE DETECTION TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── Duplicate Detection ─────────────────────");

test("normalizeQuestionText lowercases and trims", () => {
  assertEqual(normalizeQuestionText("  Hello World!  "), "hello world");
});

test("normalizeQuestionText normalizes whitespace", () => {
  assertEqual(normalizeQuestionText("hello   world"), "hello world");
});

test("questionHash produces consistent hashes", () => {
  const h1 = questionHash("Test?", ["A", "B", "C", "D"]);
  const h2 = questionHash("Test?", ["A", "B", "C", "D"]);
  assertEqual(h1, h2);
});

test("questionHash differs for different questions", () => {
  const h1 = questionHash("Question 1?", ["A", "B", "C", "D"]);
  const h2 = questionHash("Question 2?", ["A", "B", "C", "D"]);
  assert(h1 !== h2, "Different questions should have different hashes");
});

// ═══════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── Validation ──────────────────────────────");

test("valid question passes validation", () => {
  const result = validateQuestions([{
    question: "Test question?",
    options: ["A", "B", "C", "D"],
    answer: 0,
    sport: "Cricket",
    difficulty: "Easy",
    year: 2023,
    explanation: "Test",
  }]);
  assert(result.valid, "Should be valid");
  assertEqual(result.questions.length, 1);
});

test("missing question text fails", () => {
  const result = validateQuestions([{
    question: "",
    options: ["A", "B", "C", "D"],
    answer: 0,
  }]);
  assert(!result.valid || result.errors.length > 0, "Empty question should fail");
});

test("wrong number of options fails", () => {
  const result = validateQuestions([{
    question: "Test?",
    options: ["A", "B", "C"],
    answer: 0,
  }]);
  assert(result.errors.length > 0, "3 options should fail");
});

test("duplicate options fail", () => {
  const result = validateQuestions([{
    question: "Test?",
    options: ["A", "A", "C", "D"],
    answer: 0,
    sport: "Cricket",
    difficulty: "Easy",
  }]);
  assert(result.errors.length > 0, "Duplicate options should fail");
});

test("invalid answer index fails", () => {
  const result = validateQuestions([{
    question: "Test?",
    options: ["A", "B", "C", "D"],
    answer: 5,
    sport: "Cricket",
    difficulty: "Easy",
  }]);
  assert(result.errors.length > 0, "Answer index 5 should fail");
});

test("invalid sport fails", () => {
  const result = validateQuestions([{
    question: "Test?",
    options: ["A", "B", "C", "D"],
    answer: 0,
    sport: "Quidditch",
    difficulty: "Easy",
  }]);
  assert(result.errors.length > 0, "Invalid sport should fail");
});

test("invalid difficulty fails", () => {
  const result = validateQuestions([{
    question: "Test?",
    options: ["A", "B", "C", "D"],
    answer: 0,
    sport: "Cricket",
    difficulty: "Impossible",
  }]);
  assert(result.errors.length > 0, "Invalid difficulty should fail");
});

test("exactCount enforcement works", () => {
  const result = validateQuestions([{
    question: "Test?",
    options: ["A", "B", "C", "D"],
    answer: 0,
    sport: "Cricket",
    difficulty: "Easy",
  }], { exactCount: 10 });
  assert(!result.valid, "1 question should fail when 10 expected");
});

test("duplicate detection works", () => {
  const q = {
    question: "Same question?",
    options: ["A", "B", "C", "D"],
    answer: 0,
    sport: "Cricket",
    difficulty: "Easy",
  };
  const result = validateQuestions([q, q], { checkDuplicates: true });
  assert(result.duplicates.length > 0 || result.errors.length > 0, "Duplicates should be detected");
});

// ═══════════════════════════════════════════════════════════
// CSV PARSING TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── CSV Parsing ─────────────────────────────");

test("parseCSV parses basic CSV", () => {
  const csv = `question,option_a,option_b,option_c,option_d,answer,sport,difficulty,year,explanation
Who won?,A,B,C,D,0,Cricket,Easy,2023,Test`;
  const result = parseCSV(csv);
  assertEqual(result.length, 1);
});

test("parseCSV handles empty input", () => {
  const result = parseCSV("");
  assertEqual(result.length, 0);
});

test("parseCSV handles header only", () => {
  const result = parseCSV("question,option_a,option_b,option_c,option_d,answer");
  assertEqual(result.length, 0);
});

// ═══════════════════════════════════════════════════════════
// QUESTION DATA INTEGRITY TESTS
// ═══════════════════════════════════════════════════════════
console.log("\n── Question Data Integrity ─────────────────");

test("all questions have valid sports", () => {
  const validSports = new Set(SPORT_LIST);
  for (const q of QUESTIONS) {
    assert(validSports.has(q.sport), `Invalid sport: ${q.sport} in ${q.id}`);
  }
});

test("all questions have valid difficulties", () => {
  const validDiffs = new Set(DIFFICULTY_LIST);
  for (const q of QUESTIONS) {
    assert(validDiffs.has(q.difficulty), `Invalid difficulty: ${q.difficulty} in ${q.id}`);
  }
});

test("all questions have 4 options", () => {
  for (const q of QUESTIONS) {
    assertEqual(q.options.length, 4, `${q.id} should have 4 options`);
  }
});

test("all questions have valid answer indices", () => {
  for (const q of QUESTIONS) {
    assert(q.answer >= 0 && q.answer <= 3, `${q.id} has invalid answer: ${q.answer}`);
  }
});

test("all questions have year between 1990 and 2026", () => {
  for (const q of QUESTIONS) {
    assert(q.year >= 1990 && q.year <= 2026, `${q.id} has year ${q.year} out of range`);
  }
});

test("all questions have unique IDs", () => {
  const ids = new Set(QUESTIONS.map((q) => q.id));
  assertEqual(ids.size, QUESTIONS.length, "All IDs should be unique");
});

test("all questions have non-empty question text", () => {
  for (const q of QUESTIONS) {
    assert(q.question.length > 0, `${q.id} has empty question text`);
  }
});

test("all 8 sports have at least 8 questions", () => {
  for (const sport of SPORT_LIST) {
    const count = QUESTIONS.filter((q) => q.sport === sport).length;
    assert(count >= 8, `${sport} has only ${count} questions, needs at least 8`);
  }
});

test("all difficulty levels are represented", () => {
  for (const diff of DIFFICULTY_LIST) {
    const count = QUESTIONS.filter((q) => q.difficulty === diff).length;
    assert(count > 0, `No questions with difficulty: ${diff}`);
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
