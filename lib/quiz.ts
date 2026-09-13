/* ═══════════════════════════════════════════════════════════════
   ARENA — Question Selection Engine
   Intelligent selection: avoids duplicates, prefers unseen/rarely
   used questions, filters by sport/difficulty/year.
   ═══════════════════════════════════════════════════════════════ */

import { QUESTIONS, type Difficulty, type Question, type Sport } from "@/data/questions";

/** Fisher-Yates shuffle */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Track question usage across sessions */
const questionUsage = new Map<string, { timesSeen: number; lastSeenAt: number }>();

/** Session-level history to prevent duplicates within a session */
const sessionHistory = new Set<string>();

export interface SelectionOptions {
  sport?: Sport | "All Sports";
  difficulty?: Difficulty | "Mixed";
  count: number;
  yearRange?: [number, number];
  exclude?: Set<string>;
}

/**
 * Build a game with intelligent question selection.
 * Filters by sport, difficulty, year. Prefers unseen or rarely-seen questions.
 * Never returns duplicates within a single round.
 */
export function buildGame(options: SelectionOptions): Question[] {
  const { sport, difficulty, count, yearRange, exclude } = options;

  // Step 1: Filter pool
  let pool = QUESTIONS.filter((q) => {
    if (sport && sport !== "All Sports" && q.sport !== sport) return false;
    if (difficulty && difficulty !== "Mixed" && q.difficulty !== difficulty) return false;
    if (yearRange && (q.year < yearRange[0] || q.year > yearRange[1])) return false;
    if (exclude?.has(q.id)) return false;
    return true;
  });

  if (pool.length === 0) {
    // Fallback: relax filters
    pool = QUESTIONS.filter((q) => {
      if (sport && sport !== "All Sports" && q.sport !== sport) return false;
      return true;
    });
  }

  if (pool.length === 0) {
    pool = [...QUESTIONS];
  }

  // Step 2: Score and sort by selection priority
  const scored = pool.map((q) => {
    const usage = questionUsage.get(q.id);
    const timesSeen = usage?.timesSeen ?? 0;
    const lastSeen = usage?.lastSeenAt ?? 0;
    const timeSinceLastSeen = lastSeen ? Date.now() - lastSeen : Infinity;
    const inSession = sessionHistory.has(q.id);

    // Priority: unseen > long-unseen > rarely used
    // Lower score = higher priority
    let priority = 0;
    if (inSession) priority += 10000; // heavily penalize session repeats
    priority += timesSeen * 100;
    priority -= Math.min(timeSinceLastSeen / 60000, 500); // time since last seen in minutes, capped

    // Add small random jitter to prevent deterministic ordering
    priority += Math.random() * 50;

    return { question: q, priority };
  });

  scored.sort((a, b) => a.priority - b.priority);

  // Step 3: Select top N, avoiding duplicates
  const selected: Question[] = [];
  const selectedIds = new Set<string>();

  for (const { question } of scored) {
    if (selected.length >= count) break;
    if (selectedIds.has(question.id)) continue;
    selected.push(question);
    selectedIds.add(question.id);
  }

  // Step 4: Update usage tracking
  for (const q of selected) {
    const usage = questionUsage.get(q.id) ?? { timesSeen: 0, lastSeenAt: 0 };
    usage.timesSeen++;
    usage.lastSeenAt = Date.now();
    questionUsage.set(q.id, usage);
    sessionHistory.add(q.id);
  }

  // Step 5: Shuffle selected questions so order isn't always by priority
  return shuffle(selected);
}

/** Reset session history (e.g., when user explicitly wants fresh questions) */
export function resetSessionHistory() {
  sessionHistory.clear();
}

/** Get number of available questions for given filters */
export function getAvailableCount(sport?: Sport | "All Sports", difficulty?: Difficulty | "Mixed"): number {
  return QUESTIONS.filter((q) => {
    if (sport && sport !== "All Sports" && q.sport !== sport) return false;
    if (difficulty && difficulty !== "Mixed" && q.difficulty !== difficulty) return false;
    return true;
  }).length;
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
  const normalized = normalizeQuestionText(question) + "|" + options.map(o => normalizeQuestionText(o)).sort().join("|");
  // Simple hash using string charCode sums
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
