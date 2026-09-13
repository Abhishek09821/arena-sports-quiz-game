import { QUESTIONS, type Difficulty, type Question, type Sport } from "@/data/questions"

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildGame(options: { sport?: Sport | "All Sports"; difficulty?: Difficulty | "Mixed"; count: number; exclude?: Set<string> }) {
  const filtered = QUESTIONS_FILTER(options.sport, options.difficulty).filter((x) => !options.exclude?.has(x.id));
  const pool = filtered.length >= options.count ? filtered : QUESTIONS_FILTER(options.sport, options.difficulty);
  return shuffle(pool).slice(0, Math.min(options.count, pool.length));
}

function QUESTIONS_FILTER(sport?: Sport | "All Sports", difficulty?: Difficulty | "Mixed") {
  return QUESTIONS.filter((q: Question) => (sport === undefined || sport === "All Sports" || q.sport === sport) && (difficulty === undefined || difficulty === "Mixed" || q.difficulty === difficulty));
}

export function scoreAnswer(difficulty: Difficulty, secondsLeft: number, correct: boolean) {
  if (!correct) return 0;
  const base = { Easy: 100, Medium: 150, Hard: 220, Legendary: 350 }[difficulty];
  const speedBonus = Math.max(0, Math.round(secondsLeft * 4));
  return base + speedBonus;
}
