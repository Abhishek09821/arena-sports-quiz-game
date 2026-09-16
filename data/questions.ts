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

export const TOURNAMENTS_BY_SPORT: Record<Sport, string[]> = {
  Football: [
    "FIFA World Cup",
    "UEFA Champions League",
    "Premier League",
    "UEFA European Championship",
    "Copa América",
  ],
  Cricket: [
    "ICC Cricket World Cup",
    "ICC Men's T20 World Cup",
    "Indian Premier League (IPL)",
    "The Ashes",
    "ICC Champions Trophy",
  ],
  Basketball: [
    "NBA Finals & Playoffs",
    "FIBA Basketball World Cup",
    "Olympic Men's Basketball",
    "NCAA March Madness",
    "EuroLeague",
  ],
  Tennis: [
    "Wimbledon Championships",
    "Roland Garros (French Open)",
    "US Open",
    "Australian Open",
    "ATP Finals",
  ],
  "Formula 1": [
    "Monaco Grand Prix",
    "British Grand Prix (Silverstone)",
    "Italian Grand Prix (Monza)",
    "Belgian Grand Prix (Spa-Francorchamps)",
    "Abu Dhabi Grand Prix",
  ],
  Badminton: [
    "BWF World Championships",
    "All England Open Badminton",
    "Olympic Games Badminton",
    "Thomas & Uber Cup",
    "BWF World Tour Finals",
  ],
  Hockey: [
    "FIH Men's Hockey World Cup",
    "Olympic Field Hockey Tournament",
    "FIH Hockey Pro League",
    "Hockey Champions Trophy",
    "EuroHockey Championship",
  ],
  Athletics: [
    "Olympic Track & Field",
    "World Athletics Championships",
    "Diamond League",
    "World Athletics Indoor Championships",
    "World Marathon Majors",
  ],
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
