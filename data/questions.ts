/* ═══════════════════════════════════════════════════════════════
   ARENA — Sports & Question Types
   ═══════════════════════════════════════════════════════════════ */

export const SPORT_LIST = [
  "Cricket",
  "Football",
  "Basketball",
  "Tennis",
  "Formula 1",
  "Badminton",
  "Hockey",
  "Athletics",
] as const;

export type Sport = (typeof SPORT_LIST)[number];

export const DIFFICULTY_LIST = ["Easy", "Medium", "Hard", "Legendary"] as const;
export type Difficulty = (typeof DIFFICULTY_LIST)[number];

export const SPORT_META: Record<Sport, { icon: string; color: string }> = {
  Cricket: { icon: "🏏", color: "#71e6ff" },
  Football: { icon: "⚽", color: "#62e6a4" },
  Basketball: { icon: "🏀", color: "#fbbf24" },
  Tennis: { icon: "🎾", color: "#a78bfa" },
  "Formula 1": { icon: "🏎️", color: "#ff6b7a" },
  Badminton: { icon: "🏸", color: "#71e6ff" },
  Hockey: { icon: "🏑", color: "#34d399" },
  Athletics: { icon: "🏃", color: "#fb923c" },
};

export interface Question {
  id: string;
  sport: Sport;
  year: number;
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  answer: number; // 0-3
  explanation: string;
  category?: string;
  source?: string;
}

/** Helper to construct a Question with type safety */
export const q = (
  id: string,
  sport: Sport,
  year: number,
  difficulty: Difficulty,
  question: string,
  options: [string, string, string, string],
  answer: number,
  explanation: string,
  source?: string
): Question => ({
  id,
  sport,
  year,
  difficulty,
  question,
  options,
  answer,
  explanation,
  source,
});

/* ═══════════════════════════════════════════════════════════════
   Questions are now dynamically generated via AI and persisted in Supabase.
   ═══════════════════════════════════════════════════════════════ */
