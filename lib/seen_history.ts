/**
 * Centralized Persistent Seen Question & Answer Registry
 * Tracks questions and answers seen across all game modes (Classic, Challenge, Sprint, Multiplayer)
 * in localStorage across sessions on this browser. History is best-effort and
 * must never block quiz generation when browser storage is unavailable.
 */

const SEEN_REGISTRY_KEY = "arena_seen_history_v2";


export interface SeenItem {
  stem: string;
  answer?: string;
  hash?: string;
  timestamp: number;
}

interface StoredRegistry {
  stems: string[];
  answers: string[];
  hashes: string[];
}

/**
 * Normalizes question text into a canonical full-length stem for robust fuzzy deduplication
 */
export function canonicalizeStem(questionText: string): string {
  if (!questionText) return "";
  return questionText
    .toLowerCase()
    .replace(/^(which|who|what|where|when|in which|during the|in the|in|at the|at)\s+/i, "")
    .replace(/^(indian premier league|ipl|uefa champions league|champions league|fifa world cup|world cup|premier league|la liga|wrestlemania|royal rumble|summerslam|formula 1|f1|nba finals|nba)\s*,?\s*/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Normalizes answer text for exclusion comparison
 */
export function canonicalizeAnswer(answerText: string): string {
  if (!answerText) return "";
  return answerText.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

/**
 * Read current seen history from localStorage
 */
function readRegistry(): StoredRegistry {
  if (typeof window === "undefined") {
    return { stems: [], answers: [], hashes: [] };
  }
  try {
    const raw = localStorage.getItem(SEEN_REGISTRY_KEY);
    if (!raw) return { stems: [], answers: [], hashes: [] };
    const parsed = JSON.parse(raw);
    return {
      stems: Array.isArray(parsed.stems) ? parsed.stems : [],
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      hashes: Array.isArray(parsed.hashes) ? parsed.hashes : [],
    };
  } catch {
    return { stems: [], answers: [], hashes: [] };
  }
}

/**
 * Write updated seen history to localStorage
 */
function writeRegistry(registry: StoredRegistry): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Storage may be disabled or full. The generated quiz remains playable.
  }
}

/**
 * Get the most recent seen question stems to pass as exclusion list to API
 */
export function getSeenStems(limit = Infinity): string[] {
  const reg = readRegistry();
  return reg.stems.slice(-limit);
}

/**
 * Get recent seen correct answer texts to prevent repeat facts/heroes
 */
export function getSeenAnswers(limit = 100): string[] {
  const reg = readRegistry();
  return reg.answers.slice(-limit);
}

/**
 * Record a batch of questions as seen permanently for the user
 */
export function recordQuestionsAsSeen(
  questions: Array<{
    question: string;
    answerText?: string;
    correct_answer?: string;
    options?: string[];
    answer?: number;
    questionHash?: string;
    id?: string;
  }>
): void {
  if (typeof window === "undefined" || !questions || questions.length === 0) return;

  const reg = readRegistry();
  const stemSet = new Set(reg.stems.map(canonicalizeStem));
  const ansSet = new Set(reg.answers);
  const hashSet = new Set(reg.hashes);

  for (const q of questions) {
    if (!q || !q.question) continue;

    const stem = canonicalizeStem(q.question);
    if (stem && !stemSet.has(stem)) {
      stemSet.add(stem);
      reg.stems.push(q.question);
    }

    // Resolve answer text
    let ans = q.answerText || q.correct_answer;
    if (!ans && Array.isArray(q.options) && typeof q.answer === "number" && q.options[q.answer]) {
      ans = q.options[q.answer];
    }

    if (ans) {
      const canonAns = ans.trim();
      if (canonAns && !ansSet.has(canonAns)) {
        ansSet.add(canonAns);
        reg.answers.push(canonAns);
      }
    }

    if (q.questionHash && !hashSet.has(q.questionHash)) {
      hashSet.add(q.questionHash);
      reg.hashes.push(q.questionHash);
    } else if (q.id && !hashSet.has(q.id)) {
      hashSet.add(q.id);
      reg.hashes.push(q.id);
    }
  }

  writeRegistry(reg);
}

/**
 * Check if a specific question stem was already seen
 */
export function isQuestionSeen(questionText: string): boolean {
  if (!questionText) return false;
  const stem = canonicalizeStem(questionText);
  const reg = readRegistry();
  return reg.stems.some(s => { const old = canonicalizeStem(s); return old === stem || (old.length >= 35 && stem.startsWith(old)); });
}

/**
 * Clear the seen history registry (e.g. user reset or testing)
 */
export function clearSeenHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SEEN_REGISTRY_KEY);
  } catch {
    // Ignore
  }
}
