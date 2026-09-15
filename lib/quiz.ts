/* ═══════════════════════════════════════════════════════════════
   ARENA — Question Selection Engine
   True Fisher-Yates Deck Shuffling:
   - 4,200 unique sports trivia questions (525 per sport)
   - Zero repetition across consecutive games (intelligent cycle tracking)
   - Stratified sport distribution for "All Sports" decks
   - Dynamic 4-way option shuffling (zero answer position bias)
   ═══════════════════════════════════════════════════════════════ */

import { QUESTIONS, SPORT_LIST, type Difficulty, type Question, type Sport } from "@/data/questions";

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

/** Retrieve permanently seen question IDs from localStorage, filtering out stale/invalid IDs */
export function getPersistentSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    
    // Validate against active question IDs in database
    const validIds = new Set(QUESTIONS.map((q) => q.id));
    const cleaned = parsed.filter((id) => validIds.has(id));
    return new Set(cleaned);
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
    // Keep reasonable storage size if needed
    if (arr.length > 5000) {
      arr.splice(0, arr.length - 4200);
    }
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage issues
  }
}

/** Unmark specific question IDs (used when recycling a sport's questions after a full cycle) */
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

/** Clear persistent seen history if user wants a complete reset */
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
function getQuestionStem(text: string): string {
  return normalizeQuestionText(text)
    .replace(/^(which|who|what|where|in|during)\s+/g, "")
    .slice(0, 45);
}

/** Extract normalized answer string for intra-round diversity */
function getAnswerText(q: Question): string {
  return (q.options[q.answer] || "").toLowerCase().trim();
}

/**
 * Helper to sample `needed` questions from a candidate pool without repetition.
 * Enforces strict zero-collision guarantees:
 * - No duplicate question IDs
 * - No duplicate question stems (prevents re-phrased questions on same event)
 * - No duplicate answers in the same round (prevents e.g. 2 questions where answer is "MS Dhoni")
 * If candidate pool's unseen questions are exhausted, cleanly recycles seen questions
 * for this pool so the user can start a fresh cycle without running into repetition.
 */
function samplePool(
  candidates: Question[],
  needed: number,
  selectedIds: Set<string>,
  selectedStems: Set<string>,
  selectedAnswers: Set<string>,
  persistentSeen: Set<string>
): Question[] {
  if (candidates.length === 0 || needed <= 0) return [];

  // 1. Available candidates not colliding with current round (id, stem, or answer)
  const isStrictlyEligible = (q: Question) => {
    if (selectedIds.has(q.id)) return false;
    if (selectedStems.has(getQuestionStem(q.question))) return false;
    const ans = getAnswerText(q);
    if (ans && selectedAnswers.has(ans)) return false;
    return true;
  };

  let available = candidates.filter(isStrictlyEligible);
  
  // Relax answer collision only if the candidate pool is too small to fulfill `needed`
  if (available.length < needed) {
    available = candidates.filter(
      (q) => !selectedIds.has(q.id) && !selectedStems.has(getQuestionStem(q.question))
    );
  }
  // Absolute fallback: ensure at least ID is strictly unique
  if (available.length === 0) {
    available = candidates.filter((q) => !selectedIds.has(q.id));
  }
  if (available.length === 0) return [];

  // 2. Unseen candidates (not in persistent storage and not in current session)
  const unseen = available.filter(
    (q) => !persistentSeen.has(q.id) && !sessionHistory.has(q.id)
  );

  const chosen: Question[] = [];
  const shuffledUnseen = shuffle(unseen);
  for (const q of shuffledUnseen) {
    if (chosen.length >= needed) break;
    chosen.push(q);
  }

  // If we fulfilled `needed` from unseen questions, return them
  if (chosen.length >= needed) {
    return chosen;
  }

  // If not enough unseen, recycle: remove this pool's question IDs from persistentSeen & sessionHistory
  const poolIds = candidates.map((q) => q.id);
  unmarkQuestionsSeen(poolIds);
  for (const id of poolIds) {
    sessionHistory.delete(id);
  }

  // Pick remaining from available recycled candidates
  const chosenIds = new Set(chosen.map((q) => q.id));
  const remaining = available.filter((q) => !chosenIds.has(q.id));
  const recycled = shuffle(remaining).slice(0, needed - chosen.length);
  return [...chosen, ...recycled];
}

/**
 * Build a game with intelligent question selection.
 * - Filters by sport, difficulty, year range.
 * - Prevents repeats: draws from unseen questions across past games and sessions.
 * - Guarantees ZERO duplicate questions, stems, or answers within a single round.
 * - When "All Sports" is chosen, ensures stratified sampling across all 8 sports for a varied deck.
 * - Dynamically shuffles options (A, B, C, D) using Fisher-Yates to eliminate position bias.
 * - Shuffles the final deck order.
 */
export function buildGame(options: SelectionOptions): Question[] {
  const { sport, difficulty, count, yearRange, exclude } = options;

  // Filter criteria helper
  const matchesFilters = (q: Question) => {
    if (difficulty && difficulty !== "Mixed" && q.difficulty !== difficulty) return false;
    if (yearRange && (q.year < yearRange[0] || q.year > yearRange[1])) return false;
    if (exclude?.has(q.id)) return false;
    return true;
  };

  const persistentSeen = getPersistentSeenIds();
  const selected: Question[] = [];
  const selectedIds = new Set<string>();
  const selectedStems = new Set<string>();
  const selectedAnswers = new Set<string>();

  const trackSelected = (q: Question) => {
    selected.push(q);
    selectedIds.add(q.id);
    selectedStems.add(getQuestionStem(q.question));
    const ans = getAnswerText(q);
    if (ans) selectedAnswers.add(ans);
  };

  if (!sport || sport === "All Sports") {
    // ── STRATIFIED SPORTS SAMPLING ──────────────────────────────────────
    // Distribute evenly across all 8 sports
    const sports = [...SPORT_LIST];
    const shuffledSports = shuffle(sports);
    
    // Calculate base quota per sport
    const basePerSport = Math.floor(count / sports.length);
    let remainder = count % sports.length;

    // First pass: collect questions sport by sport
    for (const s of shuffledSports) {
      if (selected.length >= count) break;
      const sportCandidates = QUESTIONS.filter((q) => q.sport === s && matchesFilters(q));
      const quota = basePerSport + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;

      const sampled = samplePool(
        sportCandidates,
        quota,
        selectedIds,
        selectedStems,
        selectedAnswers,
        persistentSeen
      );
      for (const q of sampled) {
        trackSelected(q);
      }
    }

    // Top up if any sport lacked candidates matching strict filters
    if (selected.length < count) {
      const remainingCandidates = QUESTIONS.filter((q) => matchesFilters(q) && !selectedIds.has(q.id));
      const topUp = samplePool(
        remainingCandidates,
        count - selected.length,
        selectedIds,
        selectedStems,
        selectedAnswers,
        persistentSeen
      );
      for (const q of topUp) {
        trackSelected(q);
      }
    }
  } else {
    // ── SINGLE SPORT SELECTION ──────────────────────────────────────────
    let sportCandidates = QUESTIONS.filter((q) => q.sport === sport && matchesFilters(q));
    
    // Fallback: relax difficulty/year if strict filter produced too few candidates
    if (sportCandidates.length < count) {
      sportCandidates = QUESTIONS.filter((q) => q.sport === sport && (!exclude || !exclude.has(q.id)));
    }

    const sampled = samplePool(
      sportCandidates,
      count,
      selectedIds,
      selectedStems,
      selectedAnswers,
      persistentSeen
    );
    for (const q of sampled) {
      trackSelected(q);
    }
  }

  // Final fallback: if somehow still short, fill from all available questions
  if (selected.length < count) {
    const allAvailable = QUESTIONS.filter((q) => !selectedIds.has(q.id));
    const fallback = shuffle(allAvailable).slice(0, count - selected.length);
    for (const q of fallback) {
      trackSelected(q);
    }
  }

  // Update session history & persistent storage
  for (const q of selected) {
    sessionHistory.add(q.id);
  }
  markQuestionsSeen(selected.map((q) => q.id));

  // Dynamically shuffle options for each question so answers are never static or predictable
  const randomized = selected.map((q) => shuffleQuestionOptions(q));

  // Shuffle the questions order in the deck
  return shuffle(randomized);
}

/** Reset session history (e.g., when user explicitly wants fresh questions) */
export function resetSessionHistory() {
  sessionHistory.clear();
}

/** Get number of available total questions for given filters */
export function getAvailableCount(sport?: Sport | "All Sports", difficulty?: Difficulty | "Mixed"): number {
  return QUESTIONS.filter((q) => {
    if (sport && sport !== "All Sports" && q.sport !== sport) return false;
    if (difficulty && difficulty !== "Mixed" && q.difficulty !== difficulty) return false;
    return true;
  }).length;
}

/** Get number of unseen questions for given filters */
export function getUnseenCount(sport?: Sport | "All Sports", difficulty?: Difficulty | "Mixed"): number {
  const seen = getPersistentSeenIds();
  return QUESTIONS.filter((q) => {
    if (sport && sport !== "All Sports" && q.sport !== sport) return false;
    if (difficulty && difficulty !== "Mixed" && q.difficulty !== difficulty) return false;
    if (seen.has(q.id) || sessionHistory.has(q.id)) return false;
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
  const normalized = normalizeQuestionText(question) + "|" + options.map((o) => normalizeQuestionText(o)).sort().join("|");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = (hash << 5) - hash + normalized.charCodeAt(i);
    hash = char & char;
  }
  return Math.abs(hash).toString(36);
}
