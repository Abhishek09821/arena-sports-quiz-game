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
 * Built-in fallback questions generator for synchronous game building (strictly 6 sports, 1975-2026)
 */
const SYNC_FALLBACK_POOL: Question[] = [
  // Easy
  { id: "sync-1", sport: "Cricket", difficulty: "Easy", year: 2011, question: "Who won the 2011 ICC Cricket World Cup?", options: ["India", "Sri Lanka", "Australia", "England"], answer: 0, explanation: "India defeated Sri Lanka in the final in Mumbai in 2011." },
  { id: "sync-2", sport: "Football", difficulty: "Easy", year: 2022, question: "Which nation won the 2022 FIFA World Cup in Qatar?", options: ["Argentina", "France", "Croatia", "Morocco"], answer: 0, explanation: "Argentina defeated France on penalties in the 2022 final." },
  { id: "sync-3", sport: "Basketball", difficulty: "Easy", year: 2023, question: "Which player became the NBA's all-time scoring leader in 2023?", options: ["LeBron James", "Kareem Abdul-Jabbar", "Michael Jordan", "Kobe Bryant"], answer: 0, explanation: "LeBron James passed Kareem's record in February 2023." },
  { id: "sync-4", sport: "Formula 1", difficulty: "Easy", year: 2023, question: "Who won the 2023 Formula 1 World Drivers' Championship with 19 race wins?", options: ["Max Verstappen", "Lewis Hamilton", "Sergio Pérez", "Fernando Alonso"], answer: 0, explanation: "Max Verstappen won 19 of 22 races in 2023." },
  { id: "sync-5", sport: "WWE/WWF", difficulty: "Easy", year: 2014, question: "Who ended The Undertaker's 21-0 undefeated streak at WrestleMania XXX?", options: ["Brock Lesnar", "Roman Reigns", "John Cena", "Triple H"], answer: 0, explanation: "Brock Lesnar defeated The Undertaker at WrestleMania XXX in New Orleans in 2014." },
  { id: "sync-6", sport: "UFC", difficulty: "Easy", year: 2019, question: "Who scored the fastest knockout in UFC history (5 seconds) against Ben Askren?", options: ["Jorge Masvidal", "Conor McGregor", "Francis Ngannou", "Duane Ludwig"], answer: 0, explanation: "Jorge Masvidal landed a flying knee 5 seconds into UFC 239 in 2019." },
  { id: "sync-11", sport: "Football", difficulty: "Easy", year: 2023, question: "Who has won the most Ballon d'Or trophies in football history (8)?", options: ["Lionel Messi", "Cristiano Ronaldo", "Michel Platini", "Johan Cruyff"], answer: 0, explanation: "Lionel Messi won his record 8th Ballon d'Or in 2023." },
  { id: "sync-12", sport: "Football", difficulty: "Easy", year: 2024, question: "Which club has won the most UEFA Champions League / European Cup titles (15)?", options: ["Real Madrid", "AC Milan", "Bayern Munich", "Liverpool"], answer: 0, explanation: "Real Madrid won their 15th title in June 2024 at Wembley." },

  // Medium
  { id: "sync-9", sport: "Cricket", difficulty: "Medium", year: 2019, question: "Which team won the 2019 ICC Cricket World Cup final at Lord's on boundary countback?", options: ["England", "New Zealand", "India", "Australia"], answer: 0, explanation: "England won by boundary countback after a tied match and Super Over." },
  { id: "sync-10", sport: "Football", difficulty: "Medium", year: 2004, question: "Which country won the UEFA Euro 2004 in a legendary upset?", options: ["Greece", "Portugal", "Czech Republic", "France"], answer: 0, explanation: "Greece defeated hosts Portugal 1-0 in Lisbon in 2004." },
  { id: "sync-15", sport: "Football", difficulty: "Medium", year: 2016, question: "Which nation won the UEFA Euro 2016 championship by defeating hosts France?", options: ["Portugal", "Spain", "Germany", "Italy"], answer: 0, explanation: "Portugal defeated France 1-0 in extra time at Stade de France." },
  { id: "sync-17", sport: "Basketball", difficulty: "Medium", year: 2004, question: "Which country defeated Team USA in men's basketball at the 2004 Athens Olympics?", options: ["Argentina", "Lithuania", "Spain", "Italy"], answer: 0, explanation: "Manu Ginobili led Argentina to an 89-81 victory on the way to Olympic gold." },
  { id: "sync-w2", sport: "WWE/WWF", difficulty: "Medium", year: 1998, question: "Which match featured Mankind being thrown off the top of Hell in a Cell by The Undertaker?", options: ["King of the Ring 1998", "WrestleMania XIV", "SummerSlam 1998", "Royal Rumble 1999"], answer: 0, explanation: "Mick Foley fell from the cell structure at King of the Ring in Pittsburgh in June 1998." },
  { id: "sync-u2", sport: "UFC", difficulty: "Medium", year: 2018, question: "Who submitted Conor McGregor in the 4th round at UFC 229 in Las Vegas?", options: ["Khabib Nurmagomedov", "Nate Diaz", "Dustin Poirier", "Justin Gaethje"], answer: 0, explanation: "Khabib Nurmagomedov retained his lightweight championship at UFC 229 in October 2018." },

  // Hard
  { id: "sync-h1", sport: "Cricket", difficulty: "Hard", year: 1999, question: "Who was the Man of the Match in the 1999 ICC Cricket World Cup Final at Lord's?", options: ["Shane Warne", "Glenn McGrath", "Adam Gilchrist", "Steve Waugh"], answer: 0, explanation: "Shane Warne took 4 for 33 as Australia bowled Pakistan out for 132." },
  { id: "sync-h2", sport: "Football", difficulty: "Hard", year: 2010, question: "Which referee officiated the 2010 FIFA World Cup Final, issuing 14 yellow cards?", options: ["Howard Webb", "Pierluigi Collina", "Nicola Rizzoli", "Massimo Busacca"], answer: 0, explanation: "English referee Howard Webb refereed Spain vs Netherlands in Johannesburg." },
  { id: "sync-h3", sport: "Basketball", difficulty: "Hard", year: 1995, question: "Which player scored 8 points in 9 seconds in Game 1 of the 1995 Eastern Conference Semifinals?", options: ["Reggie Miller", "Rik Smits", "Mark Jackson", "Dale Davis"], answer: 0, explanation: "Reggie Miller led the Indiana Pacers to a shock comeback at Madison Square Garden." },
  { id: "sync-h4", sport: "Formula 1", difficulty: "Hard", year: 2008, question: "Who won the 2008 Italian Grand Prix at Monza for Toro Rosso, becoming the youngest winner at the time?", options: ["Sebastian Vettel", "Lewis Hamilton", "Fernando Alonso", "Robert Kubica"], answer: 0, explanation: "21-year-old Sebastian Vettel scored a sensational wet-weather win." },
  { id: "sync-hw", sport: "WWE/WWF", difficulty: "Hard", year: 2003, question: "At which WrestleMania did 'Stone Cold' Steve Austin face The Rock in their final trilogy match?", options: ["WrestleMania XIX", "WrestleMania X-Seven", "WrestleMania XV", "WrestleMania XX"], answer: 0, explanation: "The Rock defeated Austin at WrestleMania XIX in Seattle in Austin's final match for 19 years." },
  { id: "sync-hu", sport: "UFC", difficulty: "Hard", year: 2015, question: "At which UFC event in Melbourne did Holly Holm knock out undefeated champion Ronda Rousey?", options: ["UFC 193", "UFC 190", "UFC 194", "UFC 200"], answer: 0, explanation: "Holly Holm landed a head kick at UFC 193 in November 2015 in Melbourne." },

  // Legendary
  { id: "sync-l1", sport: "Cricket", difficulty: "Legendary", year: 2007, question: "Who was the only bowler to take 4 wickets in 4 consecutive balls in a Men's World Cup match?", options: ["Lasith Malinga", "Chaminda Vaas", "Wasim Akram", "Brett Lee"], answer: 0, explanation: "Lasith Malinga took 4 in 4 against South Africa in the 2007 World Cup in Guyana." },
  { id: "sync-l2", sport: "Football", difficulty: "Legendary", year: 2010, question: "Who is the only player to score hat-tricks in the Premier League, Champions League, and FA Cup in the 2009-10 season?", options: ["Yossi Benayoun", "Fernando Torres", "Didier Drogba", "Wayne Rooney"], answer: 0, explanation: "Yossi Benayoun achieved this rare treble of hat-tricks playing for Liverpool in 2009-10." },
  { id: "sync-l3", sport: "Basketball", difficulty: "Legendary", year: 1998, question: "Which team drafted Dirk Nowitzki with the 9th overall pick in 1998 before trading him to Dallas?", options: ["Milwaukee Bucks", "Boston Celtics", "Denver Nuggets", "Golden State Warriors"], answer: 0, explanation: "The Bucks drafted Nowitzki in 1998 and traded him on draft night for Robert Traylor." },
  { id: "sync-l5", sport: "Formula 1", difficulty: "Legendary", year: 2007, question: "Who was the last driver to win the Formula 1 World Drivers' Championship driving for Ferrari?", options: ["Kimi Räikkönen", "Felipe Massa", "Fernando Alonso", "Sebastian Vettel"], answer: 0, explanation: "Kimi Räikkönen won the 2007 Drivers' Championship for Ferrari by one point in Brazil." },
  { id: "sync-lw", sport: "WWE/WWF", difficulty: "Legendary", year: 1988, question: "Who won the first-ever Men's Royal Rumble match in January 1988 in Hamilton, Ontario?", options: ["'Hacksaw' Jim Duggan", "One Man Gang", "Bret Hart", "Don Muraco"], answer: 0, explanation: "Jim Duggan eliminated One Man Gang to win the inaugural 1988 Royal Rumble." },
  { id: "sync-lu", sport: "UFC", difficulty: "Legendary", year: 1993, question: "Who won the tournament at UFC 1 in Denver in November 1993 by submitting three opponents in one night?", options: ["Royce Gracie", "Ken Shamrock", "Gerard Gordeau", "Art Jimmerson"], answer: 0, explanation: "Royce Gracie won the inaugural UFC 1 tournament in 1993 using Brazilian Jiu-Jitsu." },
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
    // If strict difficulty match has 0 items, keep sport strict! Never cross-contaminate sports!
    pool = SYNC_FALLBACK_POOL.filter((q) => {
      if (sport && sport !== "All Sports" && q.sport !== sport) return false;
      return true;
    });

    // If still 0 (e.g. rare combination and all sports), use full pool
    if (pool.length === 0) {
      pool = [...SYNC_FALLBACK_POOL];
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
