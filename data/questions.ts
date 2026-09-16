/* ═══════════════════════════════════════════════════════════════
   ARENA — Sports & Question Types
   ═══════════════════════════════════════════════════════════════ */

export const SPORT_LIST = [
  "Cricket",
  "Football",
  "Basketball",
  "Formula 1",
  "WWE/WWF",
  "UFC",
] as const;

export type Sport = (typeof SPORT_LIST)[number];

export const DIFFICULTY_LIST = ["Easy", "Medium", "Hard", "Legendary"] as const;
export type Difficulty = (typeof DIFFICULTY_LIST)[number];

export const SPORT_META: Record<Sport, { icon: string; color: string; desc: string }> = {
  Cricket: { icon: "🏏", color: "#71e6ff", desc: "ICC World Cups, IPL, Ashes & T20 records" },
  Football: { icon: "⚽", color: "#62e6a4", desc: "FIFA World Cup, UEFA Champions League, Premier League" },
  Basketball: { icon: "🏀", color: "#fbbf24", desc: "NBA Finals, Playoff thrillers & Olympic hoops" },
  "Formula 1": { icon: "🏎️", color: "#ff6b7a", desc: "Grand Prix milestones, Constructors & F1 Legends" },
  "WWE/WWF": { icon: "🤼", color: "#ec4899", desc: "WrestleMania, Royal Rumble, Attitude Era & Icons" },
  UFC: { icon: "🥊", color: "#f97316", desc: "Championship fights, PPVs, knockouts & Octagon history" },
};

export const TOURNAMENTS_BY_SPORT: Record<Sport, string[]> = {
  Cricket: [
    "All Tournaments",
    "ICC Cricket World Cup",
    "ICC Men's T20 World Cup",
    "Indian Premier League (IPL)",
    "The Ashes Series",
    "ICC Champions Trophy",
    "ICC World Test Championship",
  ],
  Football: [
    "All Tournaments",
    "FIFA World Cup",
    "UEFA Champions League",
    "Premier League",
    "La Liga",
    "UEFA European Championship",
    "Copa América",
  ],
  Basketball: [
    "All Tournaments",
    "NBA Finals & Playoffs",
    "NBA Regular Season & All-Star",
    "FIBA Basketball World Cup",
    "Olympic Men's Basketball",
    "EuroLeague",
  ],
  "Formula 1": [
    "All Grand Prix",
    "World Drivers' Championship",
    "Monaco Grand Prix",
    "British Grand Prix (Silverstone)",
    "Italian Grand Prix (Monza)",
    "Abu Dhabi Grand Prix",
  ],
  "WWE/WWF": [
    "All Events",
    "WrestleMania",
    "Royal Rumble",
    "SummerSlam",
    "Survivor Series",
    "Attitude Era & World Championships",
  ],
  UFC: [
    "All Events",
    "UFC Numbered PPVs",
    "UFC World Championship Fights",
    "UFC Hall of Fame & Legends",
    "UFC Fight Night & Title Eliminators",
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
   Questions are dynamically generated on-the-fly via AI.
   Strict date validity: 1975 to 2026. Zero database persistence.
   ═══════════════════════════════════════════════════════════════ */

