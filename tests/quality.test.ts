import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePersonalizedQuiz } from "../lib/services/question_manager";
import { auditCandidateQuestion } from "../lib/services/deck_auditor";
import { validateQuestion, type RawGeneratedQuestion } from "../lib/services/question_validator";
import { getSeenStems, recordQuestionsAsSeen, isQuestionSeen } from "../lib/seen_history";
import { buildGame, resetSessionHistory } from "../lib/quiz";

const sample: RawGeneratedQuestion = {
  sport: "Football", difficulty: "Medium", year: 2008,
  question: "Which team did Lionel Messi drive for in his 2008 title season?",
  options: ["Barcelona", "Real Madrid", "Valencia", "Sevilla"], answer: "Barcelona",
  category: "Know Your Idol: Lionel Messi", explanation: "Lionel Messi won the 2008 championship driving for Barcelona.",
};
const context = { sport: "Football" as const, difficulty: "Medium" as const, idol: "Lionel Messi" };

test("rejects validly formatted questions from another sport or athlete", () => {
  const q = validateQuestion(sample).question!;
  assert.equal(auditCandidateQuestion({ ...q, sport: "Cricket" }, [], context).passed, false);
  assert.equal(auditCandidateQuestion({ ...q, question: q.question.replace("Lionel Messi", "Cristiano Ronaldo") }, [], context).passed, false);
});
test("rejects historical repeats even with different distractors", () => {
  const q = validateQuestion(sample).question!;
  assert.equal(auditCandidateQuestion(q, [], { ...context, excludeStems: [sample.question] }).passed, false);
  assert.equal(auditCandidateQuestion(q, [q], context).passed, false);
});
test("different facts may legitimately share a correct answer", () => {
  const q = validateQuestion(sample).question!;
  const other = { ...q, question: "Which team employed Lionel Messi when he made his league debut in 2007?" };
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
    generate: async () => { calls++; return [calls === 1 ? { ...sample, question: "Which team did Cristiano Ronaldo drive for in 2008?" } : sample]; },
    review: async (_options, candidates) => calls === 2 ? [] : candidates,
  });
  assert.equal(calls, 3);
  assert.equal(deck.questions.length, 1);
  assert.equal(deck.questions[0].options[deck.questions[0].answer], "Barcelona");
});
test("reviewer outage fails closed instead of bypassing factual review", async () => {
  await assert.rejects(generatePersonalizedQuiz({ ...context, mode: "idol", count: 1 }, {
    generate: async () => [sample], review: async () => { throw new Error("offline"); },
  }), /offline/);
});
test("exhausted verification fails closed rather than serving a short or easy deck", async () => {
  await assert.rejects(generatePersonalizedQuiz({ ...context, mode: "idol", count: 10 }, {
    generate: async () => [{ ...sample, difficulty: "Easy" }], review: async (_o, qs) => qs,
  }), /Could not assemble 10 fresh/);
});
test("Mixed deck enforces a real mix of difficulty labels", async () => {
  const deck = await generatePersonalizedQuiz({ sport: "Football", difficulty: "Mixed", count: 3 }, {
    generate: async options => [{ ...sample, difficulty: options.difficulty, question: `At the ${options.difficulty === "Easy" ? 2008 : options.difficulty === "Medium" ? 2009 : 2010} season opener, which team did Lionel Messi represent?` }],
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
test("unavailable browser storage never blocks quiz history", () => {
  Object.assign(globalThis, { window: {}, localStorage: {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
  } });
  try {
    assert.deepEqual(getSeenStems(), []);
    assert.doesNotThrow(() => recordQuestionsAsSeen([{ question: sample.question }]));
  } finally {
    Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "localStorage");
  }
});
test("offline fallback cannot relax difficulty, category, or exclusions", () => {
  resetSessionHistory();
  assert.throws(() => buildGame({ sport: "UFC", difficulty: "Legendary", count: 10 }));
});

test("never fills a selected non-cricket sport with generic Cricket questions", async () => {
  for (const sport of ["Football", "Basketball", "WWE/WWF"] as const) {
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

test("replenishes a provider's three-question response into an exact five-question deck", async () => {
 let batch=0;
 const deck=await generatePersonalizedQuiz({sport:"Football",difficulty:"Medium",count:5},{
 generate:async()=>Array.from({length:3},()=>({...sample,question:`During the ${1990+batch++} season, which club won the league championship?`})),review:async(_o,qs)=>qs});
 assert.equal(deck.questions.length,5);
 assert.equal(new Set(deck.questions.map(q=>q.question)).size,5);
});
test("mixed sports and all four difficulties have balanced quotas",async()=>{
 let serial=0;
 const deck=await generatePersonalizedQuiz({sport:"All Sports",difficulty:"Mixed",count:10},{
 generate:async o=>Array.from({length:o.count},()=>({...sample,sport:o.sport,difficulty:o.difficulty,question:`Which competitor secured championship number ${++serial} in this ${o.sport} competition?`})),review:async(_o,qs)=>qs});
 for(const field of ["sport","difficulty"] as const){const counts=Object.values(deck.questions.reduce<Record<string,number>>((a,q)=>{a[q[field]]=(a[q[field]]||0)+1;return a;},{}));assert.equal(counts.length,4);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);}
 assert.ok(deck.questions.every(q=>q.sport!=="General Knowledge"&&q.sport!=="UFC"&&q.sport!=="Formula 1"));
});
test("custom idols are accepted but unrelated candidates cannot pass",async()=>{
 const deck=await generatePersonalizedQuiz({sport:"Football",difficulty:"Medium",count:1,mode:"idol",idol:"Erling Haaland"},{generate:async()=>[{...sample,question:"Which club signed Erling Haaland during the 2022 summer transfer window?"}],review:async(_o,qs)=>qs});
 assert.match(deck.questions[0].question,/Erling Haaland/);
});
test("a selected decade rejects out-of-range dates",async()=>{
 await assert.rejects(generatePersonalizedQuiz({sport:"Football",difficulty:"Medium",count:1,decade:"1990-2000"},{generate:async()=>[sample],review:async(_o,qs)=>qs}),/Could not assemble/);
});
test("removed sports cannot be requested",async()=>{
 for(const sport of ["Formula 1","UFC"] as const)await assert.rejects(generatePersonalizedQuiz({sport,difficulty:"Easy",count:5}),/supported sport/);
});

test("review evidence survives validation and option randomization",async()=>{
 const verification={sources:[{title:"Official archive",url:"https://example.com/archive"}]};
 const deck=await generatePersonalizedQuiz({sport:"Football",difficulty:"Medium",count:1},{generate:async()=>[sample],review:async(_o,qs)=>qs.map(q=>({...q,verification}))});
 assert.deepEqual(deck.questions[0].verification?.sources,verification.sources);
});
