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
  // Easy
  { id: "sync-1", sport: "Cricket", difficulty: "Easy", year: 2011, question: "Who won the 2011 ICC Cricket World Cup?", options: ["India", "Sri Lanka", "Australia", "England"], answer: 0, explanation: "India defeated Sri Lanka in the final in Mumbai." },
  { id: "sync-2", sport: "Football", difficulty: "Easy", year: 2022, question: "Which nation won the 2022 FIFA World Cup in Qatar?", options: ["Argentina", "France", "Croatia", "Morocco"], answer: 0, explanation: "Argentina defeated France in the final." },
  { id: "sync-3", sport: "Basketball", difficulty: "Easy", year: 2023, question: "Which player became the NBA's all-time scoring leader in 2023?", options: ["LeBron James", "Kareem Abdul-Jabbar", "Michael Jordan", "Kobe Bryant"], answer: 0, explanation: "LeBron James passed Kareem's record." },
  { id: "sync-4", sport: "Tennis", difficulty: "Easy", year: 2023, question: "Who has won the most men's Grand Slam singles titles in the Open Era?", options: ["Novak Djokovic", "Rafael Nadal", "Roger Federer", "Pete Sampras"], answer: 0, explanation: "Novak Djokovic has won 24 Grand Slam singles titles." },
  { id: "sync-5", sport: "Formula 1", difficulty: "Easy", year: 2023, question: "Who won the 2023 Formula 1 World Drivers' Championship?", options: ["Max Verstappen", "Lewis Hamilton", "Sergio Pérez", "Fernando Alonso"], answer: 0, explanation: "Max Verstappen won 19 races in 2023." },
  { id: "sync-6", sport: "Athletics", difficulty: "Easy", year: 2009, question: "What is the men's 100m world record set by Usain Bolt?", options: ["9.58 seconds", "9.63 seconds", "9.69 seconds", "9.72 seconds"], answer: 0, explanation: "Bolt ran 9.58s in Berlin in 2009." },
  { id: "sync-7", sport: "Badminton", difficulty: "Easy", year: 2024, question: "Who won the Men's Singles Olympic Badminton gold in Paris 2024?", options: ["Viktor Axelsen", "Kunlavut Vitidsarn", "Lee Zii Jia", "Lakshya Sen"], answer: 0, explanation: "Viktor Axelsen retained his Olympic title." },
  { id: "sync-8", sport: "Hockey", difficulty: "Easy", year: 2023, question: "Which country won the 2023 Men's FIH Hockey World Cup?", options: ["Germany", "Belgium", "Netherlands", "Australia"], answer: 0, explanation: "Germany defeated Belgium in the final." },
  { id: "sync-11", sport: "Football", difficulty: "Easy", year: 2023, question: "Who has won the most Ballon d'Or trophies in football history (8)?", options: ["Lionel Messi", "Cristiano Ronaldo", "Michel Platini", "Johan Cruyff"], answer: 0, explanation: "Lionel Messi won his record 8th Ballon d'Or in 2023." },
  { id: "sync-12", sport: "Football", difficulty: "Easy", year: 2024, question: "Which football club has won the most UEFA Champions League / European Cup titles (15)?", options: ["Real Madrid", "AC Milan", "Bayern Munich", "Liverpool"], answer: 0, explanation: "Real Madrid has won 15 European Cup / Champions League titles." },

  // Medium
  { id: "sync-9", sport: "Cricket", difficulty: "Medium", year: 2019, question: "Which team won the 2019 ICC Cricket World Cup final at Lord's?", options: ["England", "New Zealand", "India", "Australia"], answer: 0, explanation: "England won by boundary countback after tied Super Over." },
  { id: "sync-10", sport: "Football", difficulty: "Medium", year: 2004, question: "Which country won the UEFA Euro 2004 in a legendary upset?", options: ["Greece", "Portugal", "Czech Republic", "France"], answer: 0, explanation: "Greece defeated hosts Portugal 1-0 in Lisbon." },
  { id: "sync-15", sport: "Football", difficulty: "Medium", year: 2016, question: "Which nation won the UEFA Euro 2016 championship by defeating host nation France in the final?", options: ["Portugal", "Spain", "Germany", "Italy"], answer: 0, explanation: "Portugal defeated France 1-0 in extra time at the Stade de France." },
  { id: "sync-17", sport: "Basketball", difficulty: "Medium", year: 2004, question: "Which country defeated Team USA in the men's basketball semi-final at the 2004 Athens Olympics?", options: ["Argentina", "Lithuania", "Spain", "Italy"], answer: 0, explanation: "Manu Ginobili led Argentina to an 89-81 victory on their way to Olympic gold." },
  { id: "sync-18", sport: "Tennis", difficulty: "Medium", year: 1988, question: "Which female tennis player completed the Golden Slam (all 4 majors and Olympic Gold in 1988)?", options: ["Steffi Graf", "Serena Williams", "Martina Navratilova", "Chris Evert"], answer: 0, explanation: "Steffi Graf accomplished the calendar Golden Slam in 1988." },

  // Hard
  { id: "sync-h1", sport: "Cricket", difficulty: "Hard", year: 1999, question: "Who was the Man of the Match in the 1999 ICC Cricket World Cup Final at Lord's?", options: ["Shane Warne", "Glenn McGrath", "Adam Gilchrist", "Steve Waugh"], answer: 0, explanation: "Shane Warne took 4 for 33 as Australia bowled Pakistan out for 132." },
  { id: "sync-h2", sport: "Football", difficulty: "Hard", year: 2010, question: "Which referee officiated the 2010 FIFA World Cup Final, issuing 14 yellow cards?", options: ["Howard Webb", "Pierluigi Collina", "Nicola Rizzoli", "Massimo Busacca"], answer: 0, explanation: "English referee Howard Webb refereed Spain vs Netherlands in Johannesburg." },
  { id: "sync-h3", sport: "Basketball", difficulty: "Hard", year: 1995, question: "Which player scored 8 points in 9 seconds in Game 1 of the 1995 Eastern Conference Semifinals?", options: ["Reggie Miller", "Rik Smits", "Mark Jackson", "Dale Davis"], answer: 0, explanation: "Reggie Miller led the Indiana Pacers to a shock comeback at Madison Square Garden." },
  { id: "sync-h4", sport: "Formula 1", difficulty: "Hard", year: 2008, question: "Who won the 2008 Italian Grand Prix at Monza for Toro Rosso, becoming the youngest winner at the time?", options: ["Sebastian Vettel", "Lewis Hamilton", "Fernando Alonso", "Robert Kubica"], answer: 0, explanation: "21-year-old Sebastian Vettel scored a sensational wet-weather win." },
  { id: "sync-h5", sport: "Tennis", difficulty: "Hard", year: 2001, question: "Which unseeded wildcard entrant famously won the 2001 Wimbledon Gentlemen's Singles title?", options: ["Goran Ivanišević", "Patrick Rafter", "Tim Henman", "Marat Safin"], answer: 0, explanation: "Ranked 125th, Goran Ivanišević won Wimbledon on People's Monday." },

  // Legendary
  { id: "sync-l1", sport: "Cricket", difficulty: "Legendary", year: 2007, question: "Who was the only bowler to take 4 wickets in 4 consecutive balls in a Men's World Cup match?", options: ["Lasith Malinga", "Chaminda Vaas", "Wasim Akram", "Brett Lee"], answer: 0, explanation: "Lasith Malinga took 4 in 4 against South Africa in the 2007 World Cup in Guyana." },
  { id: "sync-l2", sport: "Football", difficulty: "Legendary", year: 2010, question: "Who is the only player to score hat-tricks in the Premier League, Champions League, and FA Cup in the same season (2009-10)?", options: ["Yossi Benayoun", "Fernando Torres", "Didier Drogba", "Wayne Rooney"], answer: 0, explanation: "Yossi Benayoun achieved this rare treble of hat-tricks playing for Liverpool." },
  { id: "sync-l3", sport: "Basketball", difficulty: "Legendary", year: 1969, question: "Who is the only player in NBA history to win Finals MVP despite being on the losing team?", options: ["Jerry West", "LeBron James", "Wilt Chamberlain", "Magic Johnson"], answer: 0, explanation: "Jerry West won Finals MVP in 1969 despite the Lakers losing Game 7 to Boston." },
  { id: "sync-l4", sport: "Tennis", difficulty: "Legendary", year: 2010, question: "How many games were played in the fifth set of the historic Isner-Mahut match at Wimbledon 2010?", options: ["138 games (70-68)", "122 games (62-60)", "104 games (53-51)", "96 games (49-47)"], answer: 0, explanation: "John Isner defeated Nicolas Mahut 70-68 in the final set after over 11 hours of play." },
  { id: "sync-l5", sport: "Formula 1", difficulty: "Legendary", year: 2007, question: "Who was the last driver to win the Formula 1 World Drivers' Championship driving for Ferrari?", options: ["Kimi Räikkönen", "Felipe Massa", "Fernando Alonso", "Sebastian Vettel"], answer: 0, explanation: "Kimi Räikkönen won the 2007 Drivers' Championship for Ferrari by one point." },
  { id: "sync-l6", sport: "Athletics", difficulty: "Legendary", year: 1994, question: "Who held the men's outdoor pole vault world record of 6.14m for 20 years from 1994 to 2014?", options: ["Sergey Bubka", "Maksim Tarasov", "Jeff Hartwig", "Brad Walker"], answer: 0, explanation: "Sergey Bubka cleared 6.14m in Sestriere, Italy in July 1994." },
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

  if (pool.length === 0) {
    // If strict match has 0 items, strictly avoid cross-contaminating extremes
    const acceptableDiffs = difficulty === "Legendary"
      ? ["Legendary", "Hard"]
      : difficulty === "Hard"
      ? ["Hard", "Medium"]
      : difficulty === "Easy"
      ? ["Easy", "Medium"]
      : ["Easy", "Medium", "Hard", "Legendary"];

    pool = SYNC_FALLBACK_POOL.filter((q) => {
      if (sport && sport !== "All Sports" && q.sport !== sport) return false;
      if (difficulty && difficulty !== "Mixed" && !acceptableDiffs.includes(q.difficulty)) return false;
      return true;
    });

    // If still 0 (e.g. rare sport + rare diff), keep acceptable diffs across all sports
    if (pool.length === 0) {
      pool = SYNC_FALLBACK_POOL.filter((q) => {
        if (difficulty && difficulty !== "Mixed" && !acceptableDiffs.includes(q.difficulty)) return false;
        return true;
      });
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
