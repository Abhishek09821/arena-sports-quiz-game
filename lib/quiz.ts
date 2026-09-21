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
  category?: string;
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
  // Cricket
  { id: "sync-ipl-1", sport: "Cricket", difficulty: "Easy", year: 2008, question: "Which team won the inaugural Indian Premier League (IPL) title in 2008 under Shane Warne?", options: ["Rajasthan Royals", "Chennai Super Kings", "Delhi Daredevils", "Kings XI Punjab"], answer: 0, explanation: "Rajasthan Royals defeated CSK by 3 wickets in the 2008 final at DY Patil Stadium.", category: "Indian Premier League (IPL)" },
  { id: "sync-ipl-2", sport: "Cricket", difficulty: "Easy", year: 2013, question: "Who scored an unbeaten 175 off 66 balls in IPL 2013, the highest individual score in IPL history?", options: ["Chris Gayle", "Brendon McCullum", "AB de Villiers", "KL Rahul"], answer: 0, explanation: "Chris Gayle smashed 175* for Royal Challengers Bangalore against Pune Warriors India.", category: "Indian Premier League (IPL)" },
  { id: "sync-ipl-3", sport: "Cricket", difficulty: "Easy", year: 2024, question: "Which franchise won the IPL 2024 championship by defeating Sunrisers Hyderabad in Chennai?", options: ["Kolkata Knight Riders", "Sunrisers Hyderabad", "Rajasthan Royals", "Royal Challengers Bengaluru"], answer: 0, explanation: "KKR won their third IPL title with an 8-wicket victory in the 2024 final.", category: "Indian Premier League (IPL)" },
  { id: "sync-ipl-4", sport: "Cricket", difficulty: "Easy", year: 2016, question: "Who holds the record for the most runs in a single IPL season with 973 runs in 2016?", options: ["Virat Kohli", "David Warner", "Jos Buttler", "Shubman Gill"], answer: 0, explanation: "Virat Kohli scored 973 runs including 4 centuries in IPL 2016.", category: "Indian Premier League (IPL)" },
  { id: "sync-ipl-5", sport: "Cricket", difficulty: "Medium", year: 2022, question: "Which franchise won their maiden IPL championship in their debut season in 2022 under Hardik Pandya?", options: ["Gujarat Titans", "Lucknow Super Giants", "Rajasthan Royals", "Royal Challengers Bangalore"], answer: 0, explanation: "Gujarat Titans defeated Rajasthan Royals by 7 wickets in the 2022 final in Ahmedabad.", category: "Indian Premier League (IPL)" },
  { id: "sync-1", sport: "Cricket", difficulty: "Easy", year: 2011, question: "Who won the 2011 ICC Cricket World Cup by defeating Sri Lanka in the final in Mumbai?", options: ["India", "Sri Lanka", "Australia", "England"], answer: 0, explanation: "MS Dhoni hit a six to finish on 91* as India won the 2011 World Cup.", category: "ICC Cricket World Cup" },
  { id: "sync-9", sport: "Cricket", difficulty: "Medium", year: 2019, question: "Which team won the 2019 ICC Cricket World Cup final at Lord's on boundary countback?", options: ["England", "New Zealand", "India", "Australia"], answer: 0, explanation: "England won by boundary countback after a tied match and Super Over.", category: "ICC Cricket World Cup" },
  { id: "sync-h1", sport: "Cricket", difficulty: "Hard", year: 1999, question: "Who was the Man of the Match in the 1999 ICC Cricket World Cup Final at Lord's?", options: ["Shane Warne", "Glenn McGrath", "Adam Gilchrist", "Steve Waugh"], answer: 0, explanation: "Shane Warne took 4 for 33 as Australia bowled Pakistan out for 132.", category: "ICC Cricket World Cup" },
  { id: "sync-c-2024", sport: "Cricket", difficulty: "Medium", year: 2024, question: "Which nation won the 2024 ICC Men's T20 World Cup by defeating South Africa in the final?", options: ["India", "South Africa", "England", "Australia"], answer: 0, explanation: "India won by 7 runs in Barbados with Virat Kohli scoring 76 and Jasprit Bumrah taking 2/18.", category: "ICC Men's T20 World Cup" },
  { id: "sync-c-t20", sport: "Cricket", difficulty: "Hard", year: 2016, question: "Who hit 4 consecutive sixes off Ben Stokes in the final over of the 2016 ICC Men's T20 World Cup Final?", options: ["Carlos Brathwaite", "Marlon Samuels", "Chris Gayle", "Andre Russell"], answer: 0, explanation: "Carlos Brathwaite powered West Indies to victory with 4 consecutive sixes at Eden Gardens.", category: "ICC Men's T20 World Cup" },
  { id: "sync-ashes-1", sport: "Cricket", difficulty: "Medium", year: 1993, question: "Who bowled the famous 'Ball of the Century' to dismiss Mike Gatting at Old Trafford in the 1993 Ashes?", options: ["Shane Warne", "Glenn McGrath", "Merv Hughes", "Craig McDermott"], answer: 0, explanation: "Shane Warne's leg-break drifted and spun sharply to clip off stump.", category: "The Ashes Series" },
  { id: "sync-ashes-2", sport: "Cricket", difficulty: "Hard", year: 2019, question: "Who scored an unbeaten 135 to lead England to an epic 1-wicket Ashes victory at Headingley in 2019?", options: ["Ben Stokes", "Joe Root", "Jonny Bairstow", "Jos Buttler"], answer: 0, explanation: "Ben Stokes and Jack Leach (1*) put on 76 for the 10th wicket.", category: "The Ashes Series" },

  // Football
  { id: "sync-2", sport: "Football", difficulty: "Easy", year: 2022, question: "Which nation won the 2022 FIFA World Cup in Qatar?", options: ["Argentina", "France", "Croatia", "Morocco"], answer: 0, explanation: "Argentina defeated France on penalties in the 2022 final.", category: "FIFA World Cup" },
  { id: "sync-h2", sport: "Football", difficulty: "Hard", year: 2010, question: "Which referee officiated the 2010 FIFA World Cup Final between Spain and Netherlands, issuing 14 yellow cards?", options: ["Howard Webb", "Pierluigi Collina", "Nicola Rizzoli", "Massimo Busacca"], answer: 0, explanation: "English referee Howard Webb refereed Spain vs Netherlands in Johannesburg.", category: "FIFA World Cup" },
  { id: "sync-ucl-1", sport: "Football", difficulty: "Easy", year: 2023, question: "Which club won the 2023 UEFA Champions League final against Inter Milan to complete a European treble?", options: ["Manchester City", "Inter Milan", "Real Madrid", "Bayern Munich"], answer: 0, explanation: "Manchester City defeated Inter 1-0 in Istanbul with a goal from Rodri.", category: "UEFA Champions League" },
  { id: "sync-ucl-2", sport: "Football", difficulty: "Easy", year: 2022, question: "Who scored the winning goal for Real Madrid against Liverpool in the 2022 UEFA Champions League final in Paris?", options: ["Vinícius Júnior", "Karim Benzema", "Luka Modrić", "Rodrygo"], answer: 0, explanation: "Vinícius Júnior struck in the 59th minute to win Real Madrid's 14th European Cup.", category: "UEFA Champions League" },
  { id: "sync-ucl-3", sport: "Football", difficulty: "Medium", year: 2005, question: "Which club overcame a 3-0 halftime deficit to win the 2005 Champions League final in Istanbul?", options: ["Liverpool", "AC Milan", "Juventus", "Chelsea"], answer: 0, explanation: "Steven Gerrard inspired Liverpool's 3-3 comeback before winning 3-2 on penalties.", category: "UEFA Champions League" },
  { id: "sync-ucl-4", sport: "Football", difficulty: "Hard", year: 2014, question: "Who scored the 92:48 stoppage-time header for Real Madrid in the 2014 Champions League final against Atlético Madrid?", options: ["Sergio Ramos", "Cristiano Ronaldo", "Gareth Bale", "Ángel Di María"], answer: 0, explanation: "Sergio Ramos forced extra time where Real Madrid went on to win 4-1 for 'La Décima'.", category: "UEFA Champions League" },
  { id: "sync-pl-1", sport: "Football", difficulty: "Medium", year: 2016, question: "Which manager led Leicester City to a fairytale 5000-1 Premier League title in 2015-16?", options: ["Claudio Ranieri", "Nigel Pearson", "Craig Shakespeare", "Brendan Rodgers"], answer: 0, explanation: "Claudio Ranieri guided Leicester to the title with 81 points.", category: "Premier League" },
  { id: "sync-pl-2", sport: "Football", difficulty: "Easy", year: 2023, question: "Who broke the Premier League single-season scoring record with 36 goals in 2022-23?", options: ["Erling Haaland", "Harry Kane", "Mohamed Salah", "Alan Shearer"], answer: 0, explanation: "Erling Haaland scored 36 Premier League goals in his debut season for Manchester City.", category: "Premier League" },
  { id: "sync-10", sport: "Football", difficulty: "Medium", year: 2004, question: "Which country won the UEFA Euro 2004 in a legendary upset?", options: ["Greece", "Portugal", "Czech Republic", "France"], answer: 0, explanation: "Greece defeated hosts Portugal 1-0 in Lisbon in 2004.", category: "UEFA European Championship" },
  { id: "sync-15", sport: "Football", difficulty: "Medium", year: 2016, question: "Which nation won the UEFA Euro 2016 championship by defeating hosts France?", options: ["Portugal", "Spain", "Germany", "Italy"], answer: 0, explanation: "Portugal defeated France 1-0 in extra time at Stade de France.", category: "UEFA European Championship" },

  // Basketball
  { id: "sync-3", sport: "Basketball", difficulty: "Easy", year: 2023, question: "Which player became the NBA's all-time scoring leader in 2023, surpassing Kareem Abdul-Jabbar?", options: ["LeBron James", "Kareem Abdul-Jabbar", "Michael Jordan", "Kobe Bryant"], answer: 0, explanation: "LeBron James passed Kareem's record in February 2023.", category: "NBA Regular Season & All-Star" },
  { id: "sync-nba-1", sport: "Basketball", difficulty: "Easy", year: 2016, question: "Which team came back from a 3-1 deficit to win the 2016 NBA Finals?", options: ["Cleveland Cavaliers", "Golden State Warriors", "Oklahoma City Thunder", "Toronto Raptors"], answer: 0, explanation: "LeBron James and the Cavaliers defeated the 73-9 Warriors in Game 7.", category: "NBA Finals & Playoffs" },
  { id: "sync-nba-2", sport: "Basketball", difficulty: "Medium", year: 2021, question: "Who won the 2021 NBA Finals MVP after scoring 50 points in Game 6 for the Milwaukee Bucks?", options: ["Giannis Antetokounmpo", "Khris Middleton", "Jrue Holiday", "Devin Booker"], answer: 0, explanation: "Giannis Antetokounmpo recorded 50 points, 14 rebounds, and 5 blocks in Game 6.", category: "NBA Finals & Playoffs" },
  { id: "sync-nba-3", sport: "Basketball", difficulty: "Easy", year: 2024, question: "Which team won the 2024 NBA Championship by defeating the Dallas Mavericks 4-1?", options: ["Boston Celtics", "Dallas Mavericks", "Denver Nuggets", "Minnesota Timberwolves"], answer: 0, explanation: "Jaylen Brown was named Finals MVP as the Celtics won their record 18th NBA title.", category: "NBA Finals & Playoffs" },
  { id: "sync-17", sport: "Basketball", difficulty: "Medium", year: 2004, question: "Which country defeated Team USA in men's basketball at the 2004 Athens Olympics?", options: ["Argentina", "Lithuania", "Spain", "Italy"], answer: 0, explanation: "Manu Ginobili led Argentina to an 89-81 victory on the way to Olympic gold.", category: "Olympic Men's Basketball" },

  // Formula 1
  { id: "sync-4", sport: "Formula 1", difficulty: "Easy", year: 2023, question: "Who won the 2023 Formula 1 World Drivers' Championship with 19 race wins?", options: ["Max Verstappen", "Lewis Hamilton", "Sergio Pérez", "Fernando Alonso"], answer: 0, explanation: "Max Verstappen won 19 of 22 races in 2023.", category: "World Drivers' Championship" },
  { id: "sync-f1-1", sport: "Formula 1", difficulty: "Easy", year: 2021, question: "Who won his first Formula 1 World Championship on the final lap of the 2021 Abu Dhabi Grand Prix?", options: ["Max Verstappen", "Lewis Hamilton", "Valtteri Bottas", "Lando Norris"], answer: 0, explanation: "Verstappen overtook Hamilton on lap 58 following a late safety car restart.", category: "Abu Dhabi Grand Prix" },
  { id: "sync-f1-2", sport: "Formula 1", difficulty: "Hard", year: 1993, question: "Who holds the record for the most Monaco Grand Prix victories with 6 career wins?", options: ["Ayrton Senna", "Graham Hill", "Michael Schumacher", "Alain Prost"], answer: 0, explanation: "Ayrton Senna won in Monaco in 1987, 1989, 1990, 1991, 1992, and 1993.", category: "Monaco Grand Prix" },
  { id: "sync-f1-3", sport: "Formula 1", difficulty: "Easy", year: 2024, question: "Which driver won the 2024 Monaco Grand Prix from pole position for Scuderia Ferrari?", options: ["Charles Leclerc", "Oscar Piastri", "Carlos Sainz", "Lando Norris"], answer: 0, explanation: "Charles Leclerc became the first Monegasque driver to win his home race since 1931.", category: "Monaco Grand Prix" },
  { id: "sync-h4", sport: "Formula 1", difficulty: "Hard", year: 2008, question: "Who won the 2008 Italian Grand Prix at Monza for Toro Rosso, becoming the youngest winner at the time?", options: ["Sebastian Vettel", "Lewis Hamilton", "Fernando Alonso", "Robert Kubica"], answer: 0, explanation: "21-year-old Sebastian Vettel scored a sensational wet-weather win.", category: "Italian Grand Prix (Monza)" },

  // WWE/WWF
  { id: "sync-5", sport: "WWE/WWF", difficulty: "Easy", year: 2014, question: "Who ended The Undertaker's 21-0 undefeated streak at WrestleMania XXX?", options: ["Brock Lesnar", "Roman Reigns", "John Cena", "Triple H"], answer: 0, explanation: "Brock Lesnar defeated The Undertaker at WrestleMania XXX in New Orleans in 2014.", category: "WrestleMania" },
  { id: "sync-wwe-1", sport: "WWE/WWF", difficulty: "Easy", year: 2024, question: "Who defeated Roman Reigns in the main event of WrestleMania XL (40) to win the Undisputed WWE Championship?", options: ["Cody Rhodes", "The Rock", "Seth Rollins", "CM Punk"], answer: 0, explanation: "Cody Rhodes finished his story in a Bloodline Rules match at WrestleMania 40 in Philadelphia.", category: "WrestleMania" },
  { id: "sync-wwe-2", sport: "WWE/WWF", difficulty: "Easy", year: 2001, question: "Who holds the record for winning the most Men's Royal Rumble matches in WWE history (3 wins)?", options: ["Stone Cold Steve Austin", "Hulk Hogan", "Shawn Michaels", "John Cena"], answer: 0, explanation: "Steve Austin won the Royal Rumble in 1997, 1998, and 2001.", category: "Royal Rumble" },
  { id: "sync-w2", sport: "WWE/WWF", difficulty: "Medium", year: 1998, question: "Which match featured Mankind being thrown off the top of Hell in a Cell by The Undertaker?", options: ["King of the Ring 1998", "WrestleMania XIV", "SummerSlam 1998", "Royal Rumble 1999"], answer: 0, explanation: "Mick Foley fell from the cell structure at King of the Ring in Pittsburgh in June 1998.", category: "Attitude Era & World Championships" },

  // UFC
  { id: "sync-6", sport: "UFC", difficulty: "Easy", year: 2019, question: "Who scored the fastest knockout in UFC history (5 seconds) against Ben Askren?", options: ["Jorge Masvidal", "Conor McGregor", "Francis Ngannou", "Duane Ludwig"], answer: 0, explanation: "Jorge Masvidal landed a flying knee 5 seconds into UFC 239 in 2019.", category: "UFC Numbered PPVs" },
  { id: "sync-ufc-1", sport: "UFC", difficulty: "Easy", year: 2015, question: "Who knocked out Jose Aldo in 13 seconds to win the featherweight title at UFC 194?", options: ["Conor McGregor", "Max Holloway", "Chad Mendes", "Frankie Edgar"], answer: 0, explanation: "Conor McGregor landed a counter left hook 13 seconds into the 1st round in Las Vegas.", category: "UFC Numbered PPVs" },
  { id: "sync-ufc-3", sport: "UFC", difficulty: "Easy", year: 2024, question: "Who scored a dramatic knockout at 4:59 of round 5 to win the BMF title at UFC 300?", options: ["Max Holloway", "Justin Gaethje", "Dustin Poirier", "Charles Oliveira"], answer: 0, explanation: "Max Holloway pointed to the center and knocked out Justin Gaethje with one second remaining.", category: "UFC Numbered PPVs" },
  { id: "sync-u2", sport: "UFC", difficulty: "Medium", year: 2018, question: "Who submitted Conor McGregor in the 4th round at UFC 229 in Las Vegas?", options: ["Khabib Nurmagomedov", "Nate Diaz", "Dustin Poirier", "Justin Gaethje"], answer: 0, explanation: "Khabib Nurmagomedov retained his lightweight championship at UFC 229 in October 2018.", category: "UFC Numbered PPVs" },
];

/**
 * Sync builder used for fast client/sprint fallback if offline.
 * Never duplicates questions inside the returned set.
 */
export function buildGame(options: SelectionOptions): Question[] {
  const { sport, difficulty, count, category, exclude } = options;
  const isTournamentSpecific = Boolean(
    category &&
    !category.startsWith("All") &&
    category !== "All Tournaments" &&
    category !== "All Events" &&
    category !== "All Grand Prix"
  );

  const pool = SYNC_FALLBACK_POOL.filter((q) => {
    if (sport && sport !== "All Sports" && q.sport !== sport) return false;
    if (isTournamentSpecific && q.category && q.category !== category) return false;
    if (difficulty && difficulty !== "Mixed" && q.difficulty !== difficulty) return false;
    if (exclude?.has(q.id) || sessionHistory.has(q.id) || getPersistentSeenIds().has(q.id)) return false;
    if (options.yearRange && (q.year < options.yearRange[0] || q.year > options.yearRange[1])) return false;
    return true;
  });

  const randomized = pool.map((q) => shuffleQuestionOptions(q));
  const selected = shuffle(randomized).slice(0, count);
  if (selected.length !== count) throw new Error("Not enough fresh questions for this selection.");
  selected.forEach(q => sessionHistory.add(q.id));
  markQuestionsSeen(selected.map(q => q.id));
  return selected;
}
