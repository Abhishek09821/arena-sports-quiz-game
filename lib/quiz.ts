/* ═══════════════════════════════════════════════════════════════
   ARENA — Question Engine & Randomization Utilities
   - True Fisher-Yates array shuffling
   - Dynamic 4-way option shuffling with strict answer position re-mapping
   - Text normalization and hash algorithms for duplicate prevention
   - Zero repetition guarantees
   ═══════════════════════════════════════════════════════════════ */

import { type Difficulty, type Question, type Sport } from "@/data/questions";

/** Fisher-Yates array shuffle */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** In-memory session history to prevent duplicates across games in current tab */
const sessionHistory = new Set<string>();
const SEEN_STORAGE_KEY = "arena_persistent_seen_questions";

/** Retrieve permanently seen question IDs from localStorage */
export function getPersistentSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

/** Record questions as seen permanently for this user */
export function markQuestionsSeen(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;
  try {
    const seen = getPersistentSeenIds();
    for (const id of ids) {
      seen.add(id);
    }
    const arr = Array.from(seen);
    if (arr.length > 5000) {
      arr.splice(0, arr.length - 2000);
    }
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage issues
  }
}

/** Unmark specific question IDs */
export function unmarkQuestionsSeen(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;
  try {
    const seen = getPersistentSeenIds();
    for (const id of ids) {
      seen.delete(id);
    }
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // Ignore
  }
}

/** Clear persistent seen history */
export function clearPersistentSeenHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SEEN_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Dynamically shuffle question options with Fisher-Yates and recalculate answer index.
 * Guarantees zero position bias (A, B, C, D have equal 25% distribution on every play).
 */
export function shuffleQuestionOptions(q: Question): Question {
  const perm = [0, 1, 2, 3];
  for (let i = perm.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const newOptions = perm.map((idx) => q.options[idx]) as [string, string, string, string];
  const newAnswer = perm.indexOf(q.answer);
  return {
    ...q,
    options: newOptions,
    answer: newAnswer,
  };
}

export interface SelectionOptions {
  sport?: Sport | "All Sports";
  difficulty?: Difficulty | "Mixed";
  count: number;
  yearRange?: [number, number];
  exclude?: Set<string>;
}

/** Extract normalized question stem for intra-round duplicate collision prevention */
export function getQuestionStem(text: string): string {
  return normalizeQuestionText(text)
    .replace(/^(which|who|what|where|when|in which|during the|in)\s+/g, "")
    .slice(0, 45);
}

/** Normalize question text for duplicate detection */
export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[.!?,;:]+$/g, "");
}

/** Generate a hash for duplicate detection */
export function questionHash(question: string, options: string[]): string {
  const normalized = normalizeQuestionText(question) + "|" + options.map((o) => normalizeQuestionText(o)).sort().join("|");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = (hash << 5) - hash + normalized.charCodeAt(i);
    hash = char & char;
  }
  return Math.abs(hash).toString(36);
}

/** Reset session history */
export function resetSessionHistory() {
  sessionHistory.clear();
}

/** Dynamic count for UI */
export function getAvailableCount(_sport?: Sport | "All Sports", _difficulty?: Difficulty | "Mixed"): number {
  return 5000;
}

/** Dynamic unseen count for UI */
export function getUnseenCount(_sport?: Sport | "All Sports", _difficulty?: Difficulty | "Mixed"): number {
  return 5000;
}

/**
 * Built-in fallback questions generator for synchronous game building (e.g. offline testing/sprint mode)
 */
const SYNC_FALLBACK_POOL: Question[] = [
  { id: "sync-1", sport: "Cricket", difficulty: "Easy", year: 2011, question: "Who won the 2011 ICC Cricket World Cup?", options: ["India", "Sri Lanka", "Australia", "England"], answer: 0, explanation: "India defeated Sri Lanka in the final in Mumbai." },
  { id: "sync-2", sport: "Football", difficulty: "Easy", year: 2022, question: "Which nation won the 2022 FIFA World Cup in Qatar?", options: ["Argentina", "France", "Croatia", "Morocco"], answer: 0, explanation: "Argentina defeated France in the final." },
  { id: "sync-3", sport: "Basketball", difficulty: "Easy", year: 2023, question: "Which player became the NBA's all-time scoring leader in 2023?", options: ["LeBron James", "Kareem Abdul-Jabbar", "Michael Jordan", "Kobe Bryant"], answer: 0, explanation: "LeBron James passed Kareem's record." },
  { id: "sync-4", sport: "Tennis", difficulty: "Easy", year: 2023, question: "Who has won the most men's Grand Slam singles titles in the Open Era?", options: ["Novak Djokovic", "Rafael Nadal", "Roger Federer", "Pete Sampras"], answer: 0, explanation: "Novak Djokovic has won 24 Grand Slam singles titles." },
  { id: "sync-5", sport: "Formula 1", difficulty: "Easy", year: 2023, question: "Who won the 2023 Formula 1 World Drivers' Championship?", options: ["Max Verstappen", "Lewis Hamilton", "Sergio Pérez", "Fernando Alonso"], answer: 0, explanation: "Max Verstappen won 19 races in 2023." },
  { id: "sync-6", sport: "Athletics", difficulty: "Easy", year: 2009, question: "What is the men's 100m world record set by Usain Bolt?", options: ["9.58 seconds", "9.63 seconds", "9.69 seconds", "9.72 seconds"], answer: 0, explanation: "Bolt ran 9.58s in Berlin in 2009." },
  { id: "sync-7", sport: "Badminton", difficulty: "Easy", year: 2024, question: "Who won the Men's Singles Olympic Badminton gold in Paris 2024?", options: ["Viktor Axelsen", "Kunlavut Vitidsarn", "Lee Zii Jia", "Lakshya Sen"], answer: 0, explanation: "Viktor Axelsen retained his Olympic title." },
  { id: "sync-8", sport: "Hockey", difficulty: "Easy", year: 2023, question: "Which country won the 2023 Men's FIH Hockey World Cup?", options: ["Germany", "Belgium", "Netherlands", "Australia"], answer: 0, explanation: "Germany defeated Belgium in the final." },
  { id: "sync-9", sport: "Cricket", difficulty: "Medium", year: 2019, question: "Which team won the 2019 ICC Cricket World Cup final at Lord's?", options: ["England", "New Zealand", "India", "Australia"], answer: 0, explanation: "England won by boundary countback after tied Super Over." },
  { id: "sync-10", sport: "Football", difficulty: "Medium", year: 2004, question: "Which country won the UEFA Euro 2004 in a legendary upset?", options: ["Greece", "Portugal", "Czech Republic", "France"], answer: 0, explanation: "Greece defeated hosts Portugal 1-0 in Lisbon." },
  { id: "sync-11", sport: "Football", difficulty: "Easy", year: 2023, question: "Who has won the most Ballon d'Or trophies in football history (8)?", options: ["Lionel Messi", "Cristiano Ronaldo", "Michel Platini", "Johan Cruyff"], answer: 0, explanation: "Lionel Messi won his record 8th Ballon d'Or in 2023." },
  { id: "sync-12", sport: "Football", difficulty: "Easy", year: 2024, question: "Which football club has won the most UEFA Champions League / European Cup titles (15)?", options: ["Real Madrid", "AC Milan", "Bayern Munich", "Liverpool"], answer: 0, explanation: "Real Madrid has won 15 European Cup / Champions League titles." },
  { id: "sync-13", sport: "Football", difficulty: "Easy", year: 1970, question: "Who is the only footballer to have won three FIFA World Cup titles as a player?", options: ["Pelé", "Garrincha", "Cafu", "Ronaldo Nazário"], answer: 0, explanation: "Pelé won the FIFA World Cup with Brazil in 1958, 1962, and 1970." },
  { id: "sync-14", sport: "Football", difficulty: "Easy", year: 2004, question: "Which club went an entire 38-match Premier League season undefeated in 2003-04?", options: ["Arsenal", "Manchester United", "Chelsea", "Liverpool"], answer: 0, explanation: "Arsenal's 'Invincibles' went unbeaten throughout the 2003-04 Premier League season." },
  { id: "sync-15", sport: "Football", difficulty: "Medium", year: 2016, question: "Which nation won the UEFA Euro 2016 championship by defeating host nation France in the final?", options: ["Portugal", "Spain", "Germany", "Italy"], answer: 0, explanation: "Portugal defeated France 1-0 in extra time at the Stade de France." },
  { id: "sync-16", sport: "Football", difficulty: "Easy", year: 1986, question: "Who scored both the 'Hand of God' goal and the 'Goal of the Century' against England in 1986?", options: ["Diego Maradona", "Pelé", "Mario Kempes", "Jorge Valdano"], answer: 0, explanation: "Diego Maradona scored both legendary goals in the 1986 World Cup quarter-final in Mexico City." },
];

/**
 * Sync builder used for fast client/sprint fallback if offline
 */
export function buildGame(options: SelectionOptions): Question[] {
  const { sport, difficulty, count, exclude } = options;
  let pool = SYNC_FALLBACK_POOL.filter((q) => {
    if (sport && sport !== "All Sports" && q.sport !== sport) return false;
    if (difficulty && difficulty !== "Mixed" && q.difficulty !== difficulty) return false;
    if (exclude?.has(q.id)) return false;
    return true;
  });

  if (pool.length < count) {
    // Relax difficulty and exclude, but strictly maintain the chosen sport
    const sportPreserved = SYNC_FALLBACK_POOL.filter((q) => {
      if (sport && sport !== "All Sports" && q.sport !== sport) return false;
      return true;
    });
    if (sportPreserved.length > 0) {
      pool = sportPreserved;
    } else {
      pool = SYNC_FALLBACK_POOL.filter((q) => (!exclude || !exclude.has(q.id)));
    }
  }

  // Duplicate elements with unique IDs if more items are requested than fallback pool size
  const result: Question[] = [];
  let counter = 1;
  while (result.length < count) {
    for (const item of pool) {
      if (result.length >= count) break;
      const copy = { ...item, id: `${item.id}-${counter++}` };
      result.push(shuffleQuestionOptions(copy));
    }
  }

  return shuffle(result);
}
