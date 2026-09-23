/* ═══════════════════════════════════════════════════════════════
   ARENA — Sports & Question Types
   ═══════════════════════════════════════════════════════════════ */

export const SPORT_LIST = [
  "Cricket",
  "Football",
  "Basketball",
  "WWE/WWF",
  "General Knowledge",
] as const;

export type Sport = (typeof SPORT_LIST)[number] | "Formula 1" | "UFC";
export const MIXED_SPORTS = SPORT_LIST.filter(s => s !== "General Knowledge");

export const DIFFICULTY_LIST = ["Easy", "Medium", "Hard", "Legendary"] as const;
export type Difficulty = (typeof DIFFICULTY_LIST)[number];

export const SPORT_META: Record<Sport, { icon: string; color: string; desc: string }> = {
  "General Knowledge": { icon: "GK", color: "#a78bfa", desc: "History, science, geography, arts & culture" },
  Cricket: { icon: "CR", color: "#71e6ff", desc: "ICC World Cups, IPL, Ashes & T20 records" },
  Football: { icon: "FB", color: "#62e6a4", desc: "FIFA World Cup, UEFA Champions League, Premier League" },
  Basketball: { icon: "BB", color: "#fbbf24", desc: "NBA Finals, Playoff thrillers & Olympic hoops" },
  "Formula 1": { icon: "F1", color: "#ff6b7a", desc: "Grand Prix milestones, Constructors & F1 Legends" },
  "WWE/WWF": { icon: "WW", color: "#ec4899", desc: "WrestleMania, Royal Rumble, Attitude Era & Icons" },
  UFC: { icon: "UFC", color: "#f97316", desc: "Championship fights, PPVs, knockouts & Octagon history" },
};

export const TOURNAMENTS_BY_SPORT: Record<Sport, string[]> = {
  "General Knowledge": ["All Topics"],
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
  verification?: {sources: {title:string;url:string}[];searchHtml?:string};
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

/** Decade filter options for user-selectable era */
export const DECADE_OPTIONS = [
  { label: "All Decades", value: "all", range: [1975, 2026] as [number, number] },
  { label: "1980–1989", value: "1980-1990", range: [1980, 1989] as [number, number] },
  { label: "1990–1999", value: "1990-2000", range: [1990, 1999] as [number, number] },
  { label: "2000–2009", value: "2000-2010", range: [2000, 2009] as [number, number] },
  { label: "2010–2019", value: "2010-2020", range: [2010, 2019] as [number, number] },
  { label: "2020–Current", value: "2020-current", range: [2020, 2026] as [number, number] },
] as const;

export type DecadeOption = (typeof DECADE_OPTIONS)[number]["value"];

/** Top 10 all-time legends for each sport — used in "Know Your Idol" mode */
export const IDOL_BY_SPORT: Record<Sport, { name: string; nickname?: string; era: string }[]> = {
  "General Knowledge": [],
  Cricket: [
    { name: "Sachin Tendulkar", nickname: "Master Blaster", era: "1989–2013" },
    { name: "Virat Kohli", nickname: "King Kohli", era: "2008–present" },
    { name: "MS Dhoni", nickname: "Captain Cool", era: "2004–2020" },
    { name: "Sir Don Bradman", nickname: "The Don", era: "1928–1948" },
    { name: "Brian Lara", nickname: "Prince of Trinidad", era: "1990–2007" },
    { name: "Shane Warne", nickname: "King of Spin", era: "1992–2007" },
    { name: "Wasim Akram", nickname: "Sultan of Swing", era: "1984–2003" },
    { name: "Ricky Ponting", nickname: "Punter", era: "1995–2012" },
    { name: "Jacques Kallis", nickname: "The Great All-Rounder", era: "1995–2014" },
    { name: "Sir Viv Richards", nickname: "Master Blaster", era: "1974–1991" },
  ],
  Football: [
    { name: "Pelé", nickname: "O Rei", era: "1956–1977" },
    { name: "Diego Maradona", nickname: "El Pibe de Oro", era: "1976–1997" },
    { name: "Lionel Messi", nickname: "La Pulga", era: "2004–present" },
    { name: "Cristiano Ronaldo", nickname: "CR7", era: "2002–present" },
    { name: "Zinedine Zidane", nickname: "Zizou", era: "1988–2006" },
    { name: "Franz Beckenbauer", nickname: "Der Kaiser", era: "1964–1983" },
    { name: "Johan Cruyff", nickname: "El Flaco", era: "1964–1984" },
    { name: "Ronaldo Nazário", nickname: "O Fenômeno", era: "1993–2011" },
    { name: "Kylian Mbappé", nickname: "Donatello", era: "2015–present" },
    { name: "Neymar Jr", nickname: "Ney", era: "2009–present" },
  ],
  Basketball: [
    { name: "Michael Jordan", nickname: "His Airness", era: "1984–2003" },
    { name: "LeBron James", nickname: "King James", era: "2003–present" },
    { name: "Kobe Bryant", nickname: "Black Mamba", era: "1996–2016" },
    { name: "Magic Johnson", nickname: "Magic", era: "1979–1996" },
    { name: "Larry Bird", nickname: "Larry Legend", era: "1979–1992" },
    { name: "Shaquille O'Neal", nickname: "Shaq", era: "1992–2011" },
    { name: "Kareem Abdul-Jabbar", nickname: "Cap", era: "1969–1989" },
    { name: "Tim Duncan", nickname: "The Big Fundamental", era: "1997–2016" },
    { name: "Stephen Curry", nickname: "Chef Curry", era: "2009–present" },
    { name: "Wilt Chamberlain", nickname: "The Big Dipper", era: "1959–1973" },
  ],
  "Formula 1": [
    { name: "Michael Schumacher", nickname: "Schumi", era: "1991–2012" },
    { name: "Lewis Hamilton", nickname: "Still I Rise", era: "2007–present" },
    { name: "Ayrton Senna", nickname: "Magic", era: "1984–1994" },
    { name: "Alain Prost", nickname: "The Professor", era: "1980–1993" },
    { name: "Max Verstappen", nickname: "Mad Max", era: "2015–present" },
    { name: "Sebastian Vettel", nickname: "Baby Schumi", era: "2007–2022" },
    { name: "Juan Manuel Fangio", nickname: "El Maestro", era: "1950–1958" },
    { name: "Niki Lauda", nickname: "The Rat", era: "1971–1985" },
    { name: "Fernando Alonso", nickname: "El Nano", era: "2001–present" },
    { name: "Kimi Räikkönen", nickname: "Iceman", era: "2001–2021" },
  ],
  "WWE/WWF": [
    { name: "The Undertaker", nickname: "The Deadman", era: "1990–2020" },
    { name: "Stone Cold Steve Austin", nickname: "Texas Rattlesnake", era: "1995–2003" },
    { name: "The Rock", nickname: "The People's Champion", era: "1996–2024" },
    { name: "John Cena", nickname: "The Champ", era: "2002–present" },
    { name: "Shawn Michaels", nickname: "The Heartbreak Kid", era: "1988–2010" },
    { name: "Triple H", nickname: "The Game", era: "1995–2022" },
    { name: "Hulk Hogan", nickname: "The Immortal", era: "1977–2012" },
    { name: "Randy Savage", nickname: "Macho Man", era: "1985–2004" },
    { name: "Ric Flair", nickname: "The Nature Boy", era: "1972–2022" },
    { name: "Bret Hart", nickname: "The Hitman", era: "1984–2000" },
  ],
  UFC: [
    { name: "Jon Jones", nickname: "Bones", era: "2008–present" },
    { name: "Khabib Nurmagomedov", nickname: "The Eagle", era: "2008–2020" },
    { name: "Georges St-Pierre", nickname: "GSP / Rush", era: "2002–2017" },
    { name: "Anderson Silva", nickname: "The Spider", era: "2000–2020" },
    { name: "Conor McGregor", nickname: "The Notorious", era: "2008–present" },
    { name: "Amanda Nunes", nickname: "The Lioness", era: "2011–2023" },
    { name: "Demetrious Johnson", nickname: "Mighty Mouse", era: "2010–present" },
    { name: "Daniel Cormier", nickname: "DC", era: "2009–2020" },
    { name: "Stipe Miocic", nickname: "The Silencer", era: "2011–2021" },
    { name: "Max Holloway", nickname: "Blessed", era: "2012–present" },
  ],
};


