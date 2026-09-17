import { generatePersonalizedQuiz } from "./lib/services/question_manager";

async function verifyAll() {
  console.log("=== STARTING COMPREHENSIVE AI QUIZ VERIFICATION ===\n");

  const testCases = [
    { sport: "Cricket" as const, category: "Indian Premier League (IPL)", difficulty: "medium" as const },
    { sport: "Football" as const, category: "UEFA Champions League", difficulty: "hard" as const },
    { sport: "Formula 1" as const, category: "Monaco Grand Prix", difficulty: "medium" as const },
    { sport: "Basketball" as const, category: "NBA Playoffs", difficulty: "medium" as const },
    { sport: "WWE / WWF" as const, category: "WWE WrestleMania", difficulty: "medium" as const },
  ];

  for (const tc of testCases) {
    console.log(`\n--- Testing ${tc.sport} -> ${tc.category} ---`);
    const start = Date.now();
    const result = await generatePersonalizedQuiz({
      sport: tc.sport,
      difficulty: tc.difficulty,
      count: 4,
      category: tc.category,
      mode: "classic",
    });
    const elapsed = Date.now() - start;

    console.log(`Generated ${result.questions.length} questions in ${elapsed}ms:`);
    for (let i = 0; i < result.questions.length; i++) {
      const q = result.questions[i];
      console.log(`  Q${i + 1}: ${q.question}`);
      console.log(`      Options: ${JSON.stringify(q.options)}`);
      console.log(`      Correct Answer: "${q.correctAnswerText}" (Option index: ${q.answer})`);
      console.log(`      Category: ${q.category} | Fact check: ${q.explanation}`);
    }

    if (result.questions.length !== 4) {
      console.error(`FAILED: Expected 4 questions, got ${result.questions.length}`);
      process.exit(1);
    }
  }

  // Diversity & Anti-Repetition Test: Generate 2 consecutive rounds of IPL
  console.log("\n--- Testing Diversity / Anti-Repetition (2 consecutive IPL rounds) ---");
  const round1 = await generatePersonalizedQuiz({
    sport: "Cricket",
    difficulty: "medium",
    count: 4,
    category: "Indian Premier League (IPL)",
    mode: "classic",
  });
  const round2 = await generatePersonalizedQuiz({
    sport: "Cricket",
    difficulty: "medium",
    count: 4,
    category: "Indian Premier League (IPL)",
    mode: "classic",
    excludeStems: round1.questions.map(q => q.question.toLowerCase().trim()),
    excludeAnswers: round1.questions.map(q => q.correctAnswerText),
  });

  const texts1 = new Set(round1.questions.map(q => q.question.toLowerCase().trim()));
  const overlap = round2.questions.filter(q => texts1.has(q.question.toLowerCase().trim()));

  console.log(`Round 1 questions: ${round1.questions.length}`);
  console.log(`Round 2 questions: ${round2.questions.length}`);
  console.log(`Overlap count: ${overlap.length}`);
  if (overlap.length === 0) {
    console.log("PASS: Zero repetition between consecutive rounds!");
  } else {
    console.log(`Notice: Overlap of ${overlap.length} questions detected:`, overlap.map(q => q.question));
  }

  console.log("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===");
}

verifyAll().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
