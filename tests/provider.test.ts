import assert from "node:assert/strict";
import { test } from "node:test";
import { generateAIQuestions, reviewAIQuestions } from "../lib/services/ai_question_generator";
import { generatePersonalizedQuiz } from "../lib/services/question_manager";

const question = {
  sport: "Cricket", difficulty: "Medium", year: 2011, category: "ICC Cricket World Cup",
  question: "Which nation won the 2011 ICC Cricket World Cup final?",
  options: ["India", "Sri Lanka", "Australia", "Pakistan"], answer: "India",
  explanation: "India defeated Sri Lanka in the 2011 final.",
};
const options = { sport: "Cricket" as const, difficulty: "Medium" as const, count: 1, mode: "challenge" as const };
const envNames = ["CHALLENGE_AI_API_KEY", "CHALLENGE_AI_MODEL", "IDOL_AI_API_KEY", "GEMINI_IDOL_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_CHALLENGE_API_KEY", "MULTIPLAYER_AI_API_KEY", "GROQ_API_KEY", "XAI_API_KEY", "VERIFICATION_AI_API_KEY", "VERIFICATION_AI_MODEL"];
async function isolated(run: () => Promise<void>) {
  const original = new Map(envNames.map(name => [name, process.env[name]]));
  const fetchBefore = globalThis.fetch;
  envNames.forEach(name => delete process.env[name]);
  try { await run(); } finally {
    globalThis.fetch = fetchBefore;
    original.forEach((value, name) => { if (value === undefined) delete process.env[name]; else process.env[name] = value; });
  }
}
function response(grounded = false) {
  return Response.json({ candidates: [{ content: {parts: [{text: JSON.stringify({questions:[question]})}]}, ...(grounded ? {groundingMetadata: {groundingChunks: [{web:{uri:"https://www.icc-cricket.com/",title:"ICC"}}]}} : {}) }] });
}

test("a retired model falls back to a supported model without weakening validation", () => isolated(async () => {
  process.env.CHALLENGE_AI_API_KEY = "test-key";
  process.env.CHALLENGE_AI_MODEL = "retired-model";
  const requests: string[] = [];
  globalThis.fetch = async input => {
    requests.push(String(input));
    return requests.length === 1 ? Response.json({error:{message:"Retired"}},{status:404}) : response();
  };
  const questions = await generateAIQuestions(options);
  assert.equal(questions.length, 1);
  assert.equal(requests.length, 2);
  assert.match(requests[1], /gemini-3\.6-flash:generateContent/);
}));

test("a grounded factual review preserves its source evidence", () => isolated(async () => {
  process.env.VERIFICATION_AI_API_KEY = "test-review-key";
  globalThis.fetch = async (_input, init) => {
    assert.ok(JSON.parse(String(init?.body)).tools[0].google_search);
    return response(true);
  };
  const approved = await reviewAIQuestions(options, [question]);
  assert.equal(approved[0].verification?.sources[0].title, "ICC");
}));

test("a reviewer cannot approve without web evidence", () => isolated(async () => {
  process.env.VERIFICATION_AI_API_KEY = "test-review-key";
  globalThis.fetch = async () => response(false);
  await assert.rejects(reviewAIQuestions(options, [question]), /no web evidence/);
}));

test("provider outages do not repeat five costly generation attempts", async () => {
  let calls = 0;
  await assert.rejects(generatePersonalizedQuiz(options, {
    generate: async () => { calls++; throw new Error("AI quota is exhausted"); },
    review: async (_o, qs) => qs,
  }), /quota/);
  assert.equal(calls, 1);
});
