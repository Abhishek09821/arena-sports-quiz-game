import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePersonalizedQuiz } from "../lib/services/question_manager";
import { auditCandidateQuestion } from "../lib/services/deck_auditor";
import { validateQuestion, type RawGeneratedQuestion } from "../lib/services/question_validator";
import { getSeenStems, recordQuestionsAsSeen, isQuestionSeen } from "../lib/seen_history";
import { buildGame, resetSessionHistory } from "../lib/quiz";

const sample: RawGeneratedQuestion = {
  sport: "Formula 1", difficulty: "Medium", year: 2008,
  question: "Which team did Lewis Hamilton drive for in his 2008 title season?",
  options: ["McLaren", "Ferrari", "Renault", "Williams"], answer: "McLaren",
  category: "Know Your Idol: Lewis Hamilton", explanation: "Lewis Hamilton won the 2008 championship driving for McLaren.",
};
const context = { sport: "Formula 1" as const, difficulty: "Medium" as const, idol: "Lewis Hamilton" };

test("rejects validly formatted questions from another sport or athlete", () => {
  const q = validateQuestion(sample).question!;
  assert.equal(auditCandidateQuestion({ ...q, sport: "Cricket" }, [], context).passed, false);
  assert.equal(auditCandidateQuestion({ ...q, question: q.question.replace("Lewis Hamilton", "Sebastian Vettel") }, [], context).passed, false);
});
test("rejects historical repeats even with different distractors", () => {
  const q = validateQuestion(sample).question!;
  assert.equal(auditCandidateQuestion(q, [], { ...context, excludeStems: [sample.question] }).passed, false);
  assert.equal(auditCandidateQuestion(q, [q], context).passed, false);
});
test("different facts may legitimately share a correct answer", () => {
  const q = validateQuestion(sample).question!;
  const other = { ...q, question: "Which team employed Lewis Hamilton when he made his F1 debut in 2007?" };
  assert.equal(auditCandidateQuestion(other, [q], context).passed, true);
});
test("malformed provider fields return validation errors instead of crashing", () => {
  for (const change of [{ sport: 12 }, { difficulty: [] }, { options: "bad" }, { answer: 1.5 }]) {
    assert.equal(validateQuestion({ ...sample, ...change }).valid, false);
  }
});
test("rejects wrong tournament without relabelling it", () => {
  assert.equal(validateQuestion(sample, "Monaco Grand Prix").valid, false);
});
test("automatically replaces reviewer-rejected and off-idol candidates", async () => {
  let calls = 0;
  const deck = await generatePersonalizedQuiz({ ...context, mode: "idol", count: 1 }, {
    generate: async () => { calls++; return [calls === 1 ? { ...sample, question: "Which team did Sebastian Vettel drive for in 2008?" } : sample]; },
    review: async (_options, candidates) => calls === 2 ? [] : candidates,
  });
  assert.equal(calls, 3);
  assert.equal(deck.questions.length, 1);
  assert.equal(deck.questions[0].options[deck.questions[0].answer], "McLaren");
});
test("exhausted verification fails closed rather than serving a short or easy deck", async () => {
  await assert.rejects(generatePersonalizedQuiz({ ...context, mode: "idol", count: 10 }, {
    generate: async () => [{ ...sample, difficulty: "Easy" }], review: async (_o, qs) => qs,
  }), /Could not assemble 10 fresh/);
});
test("Mixed deck enforces a real mix of difficulty labels", async () => {
  const deck = await generatePersonalizedQuiz({ sport: "Formula 1", difficulty: "Mixed", count: 3 }, {
    generate: async options => [{ ...sample, difficulty: options.difficulty, question: `At the ${options.difficulty === "Easy" ? 2008 : options.difficulty === "Medium" ? 2009 : 2010} season opener, which team did Lewis Hamilton represent?` }],
    review: async (_o, qs) => qs,
  });
  assert.equal(new Set(deck.questions.map(q => q.difficulty)).size, 3);
});
test("history retains entries older than the former 3000-item cap", () => {
  const values = new Map<string, string>();
  Object.assign(globalThis, { window: {}, localStorage: { getItem: (k: string) => values.get(k) || null, setItem: (k: string, v: string) => values.set(k, v) } });
  try {
    recordQuestionsAsSeen(Array.from({ length: 3100 }, (_, i) => ({ question: `In event ${i}, which competitor finished first?` })));
    assert.equal(getSeenStems().length, 3100);
    assert.equal(isQuestionSeen("In event 0, which competitor finished first?"), true);
  } finally {
    Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "localStorage");
  }
});
test("offline fallback cannot relax difficulty, category, or exclusions", () => {
  resetSessionHistory();
  assert.throws(() => buildGame({ sport: "UFC", difficulty: "Legendary", count: 10 }));
});

test("never fills a selected non-cricket sport with generic Cricket questions", async () => {
  for (const sport of ["Football", "Basketball", "Formula 1", "WWE/WWF", "UFC"] as const) {
    await assert.rejects(generatePersonalizedQuiz({ sport, difficulty: "Medium", count: 10 }, {
      generate: async () => [{ ...sample, sport: "Cricket" }], review: async (_o, qs) => qs,
    }), /Could not assemble 10 fresh/);
  }
});

test("missing event dates cannot pass the generated-question gate", async () => {
  await assert.rejects(generatePersonalizedQuiz({ ...context, mode: "idol", count: 1 }, {
    generate: async () => [{ ...sample, year: undefined }], review: async (_o, qs) => qs,
  }), /Could not assemble 1 fresh/);
});
