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
const q = (
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
   SEED QUESTION BANK
   All questions use original wording.
   All facts are verifiable from official sports records.
   ═══════════════════════════════════════════════════════════════ */

export const QUESTIONS: Question[] = [
  // ── Cricket ────────────────────────────────────────────────
  q("cr-001", "Cricket", 1992, "Easy", "Which country won the 1992 Cricket World Cup?", ["Australia", "Pakistan", "England", "South Africa"], 1, "Pakistan defeated England in the final in Melbourne.", "ICC World Cup records"),
  q("cr-002", "Cricket", 1996, "Easy", "Which team won the 1996 Cricket World Cup?", ["Sri Lanka", "India", "Pakistan", "Australia"], 0, "Sri Lanka beat Australia in the final in Lahore.", "ICC World Cup records"),
  q("cr-003", "Cricket", 2007, "Medium", "Who captained India during the 2007 inaugural T20 World Cup?", ["Rahul Dravid", "Sourav Ganguly", "MS Dhoni", "Anil Kumble"], 2, "MS Dhoni led India to the title in the inaugural T20 World Cup.", "ICC T20 World Cup records"),
  q("cr-004", "Cricket", 2011, "Medium", "Where was the 2011 Cricket World Cup final played?", ["Kolkata", "Mumbai", "Delhi", "Chennai"], 1, "The final was played at Wankhede Stadium in Mumbai.", "ICC World Cup records"),
  q("cr-005", "Cricket", 2019, "Hard", "Who scored England's highest individual score in the 2019 World Cup final?", ["Joe Root", "Jos Buttler", "Ben Stokes", "Jason Roy"], 2, "Ben Stokes made 84 in England's tied chase before the Super Over.", "ICC World Cup 2019 scorecard"),
  q("cr-006", "Cricket", 2023, "Legendary", "Which Australian bowler took the decisive wicket of Rohit Sharma in the 2023 ODI World Cup final?", ["Mitchell Starc", "Josh Hazlewood", "Pat Cummins", "Glenn Maxwell"], 2, "Pat Cummins removed Rohit Sharma and finished with figures of 2/34.", "ICC World Cup 2023 scorecard"),
  q("cr-007", "Cricket", 2005, "Hard", "England won the 2005 Edgbaston Ashes Test by how many runs?", ["2 runs", "5 runs", "3 wickets", "7 runs"], 0, "England won at Edgbaston by just two runs in one of cricket's greatest Tests.", "ESPNcricinfo Ashes 2005"),
  q("cr-008", "Cricket", 2014, "Medium", "Who won the 2014 men's ICC World Twenty20?", ["Sri Lanka", "India", "West Indies", "Australia"], 0, "Sri Lanka defeated India in the final in Dhaka.", "ICC T20 World Cup records"),
  q("cr-009", "Cricket", 2003, "Easy", "Which country hosted the 2003 Cricket World Cup?", ["South Africa", "India", "England", "Australia"], 0, "The 2003 World Cup was held in South Africa.", "ICC records"),
  q("cr-010", "Cricket", 2015, "Medium", "Who scored a double century in the 2015 World Cup pool stage?", ["Chris Gayle", "AB de Villiers", "Martin Guptill", "Brendon McCullum"], 0, "Chris Gayle scored 215 against Zimbabwe, the first World Cup double century.", "ICC World Cup 2015 records"),
  q("cr-011", "Cricket", 2020, "Hard", "Which bowler took a Test hat-trick against Australia at the MCG in December 2020?", ["Ajinkya Rahane", "Jasprit Bumrah", "Mohammed Siraj", "No bowler took a hat-trick"], 3, "No bowler took a hat-trick at the MCG in December 2020. This is a trick question testing knowledge precision.", "ESPNcricinfo"),
  q("cr-012", "Cricket", 1999, "Legendary", "What was the target score that South Africa needed in the tied 1999 World Cup semi-final against Australia?", ["214", "213", "272", "248"], 1, "South Africa needed 213 to win. The match ended in a tie, and Australia advanced on net run rate.", "ICC World Cup 1999 records"),

  // ── Football ───────────────────────────────────────────────
  q("fb-001", "Football", 1994, "Easy", "Which nation won the 1994 FIFA World Cup?", ["Brazil", "Italy", "Germany", "Argentina"], 0, "Brazil beat Italy on penalties in Pasadena.", "FIFA World Cup records"),
  q("fb-002", "Football", 1998, "Easy", "Who won the 1998 FIFA World Cup?", ["France", "Brazil", "Germany", "Croatia"], 0, "France beat Brazil 3-0 in the final.", "FIFA World Cup records"),
  q("fb-003", "Football", 2002, "Medium", "Who finished as the top scorer at the 2002 FIFA World Cup?", ["Ronaldo", "Miroslav Klose", "Rivaldo", "Christian Vieri"], 0, "Brazilian striker Ronaldo scored eight goals.", "FIFA Golden Boot 2002"),
  q("fb-004", "Football", 2010, "Medium", "Who scored the winning goal in the 2010 FIFA World Cup final?", ["David Villa", "Andres Iniesta", "Xavi", "Fernando Torres"], 1, "Andres Iniesta scored in extra time against the Netherlands.", "FIFA World Cup 2010 final"),
  q("fb-005", "Football", 2014, "Hard", "Which goalkeeper won the Golden Glove at the 2014 World Cup?", ["Manuel Neuer", "Iker Casillas", "Keylor Navas", "Sergio Romero"], 0, "Manuel Neuer was awarded the Golden Glove.", "FIFA Golden Glove 2014"),
  q("fb-006", "Football", 2018, "Hard", "Which team reached its first World Cup final in 2018?", ["Belgium", "Croatia", "England", "Portugal"], 1, "Croatia reached the final for the first time in their history.", "FIFA World Cup 2018"),
  q("fb-007", "Football", 2022, "Legendary", "Which player scored the opening goal of the 2022 World Cup final?", ["Lionel Messi", "Angel Di Maria", "Kylian Mbappe", "Olivier Giroud"], 0, "Messi scored from the penalty spot in the 23rd minute.", "FIFA World Cup 2022 final"),
  q("fb-008", "Football", 2023, "Medium", "Which club won the 2022-23 UEFA Champions League?", ["Real Madrid", "Manchester City", "Inter Milan", "Bayern Munich"], 1, "Manchester City beat Inter 1-0 in Istanbul for their first Champions League title.", "UEFA Champions League records"),
  q("fb-009", "Football", 2006, "Easy", "Which country won the 2006 FIFA World Cup?", ["Italy", "France", "Germany", "Brazil"], 0, "Italy beat France on penalties in the final in Berlin.", "FIFA World Cup 2006"),
  q("fb-010", "Football", 1990, "Medium", "Who won the Golden Boot at the 1990 World Cup?", ["Salvatore Schillaci", "Gary Lineker", "Lothar Matthaus", "Roger Milla"], 0, "Salvatore Schillaci scored six goals for Italy.", "FIFA Golden Boot 1990"),
  q("fb-011", "Football", 2012, "Hard", "Which country won Euro 2012?", ["Spain", "Italy", "Germany", "Portugal"], 0, "Spain defeated Italy 4-0 in the final in Kyiv.", "UEFA Euro 2012"),
  q("fb-012", "Football", 2015, "Legendary", "How many goals did Lionel Messi score in all competitions during the 2011-12 season?", ["73", "82", "91", "68"], 0, "Messi scored 73 goals in all competitions for Barcelona and Argentina in the 2011-12 season.", "Official Barcelona and FIFA records"),

  // ── Basketball ─────────────────────────────────────────────
  q("ba-001", "Basketball", 1992, "Easy", "Which NBA team won the 1991-92 championship?", ["Chicago Bulls", "Portland Trail Blazers", "Los Angeles Lakers", "Utah Jazz"], 0, "The Bulls won their second straight NBA title.", "NBA Finals records"),
  q("ba-002", "Basketball", 1996, "Medium", "Which team drafted Kobe Bryant in the 1996 NBA Draft?", ["Los Angeles Lakers", "Charlotte Hornets", "Philadelphia 76ers", "Boston Celtics"], 1, "Charlotte selected Bryant at No. 13 and traded him to the Lakers.", "NBA Draft 1996"),
  q("ba-003", "Basketball", 2001, "Easy", "Who won the 2000-01 NBA MVP award?", ["Shaquille O'Neal", "Kobe Bryant", "Allen Iverson", "Tim Duncan"], 2, "Allen Iverson was the regular-season MVP.", "NBA MVP awards"),
  q("ba-004", "Basketball", 2008, "Medium", "Which team did the Boston Celtics defeat in the 2008 NBA Finals?", ["Los Angeles Lakers", "Cleveland Cavaliers", "San Antonio Spurs", "Orlando Magic"], 0, "Boston beat the Los Angeles Lakers 4-2.", "NBA Finals 2008"),
  q("ba-005", "Basketball", 2016, "Hard", "Which team overcame a 3-1 Finals deficit to win the 2016 NBA title?", ["Cleveland Cavaliers", "Golden State Warriors", "Oklahoma City Thunder", "Toronto Raptors"], 0, "Cleveland became the first team to erase a 3-1 Finals deficit.", "NBA Finals 2016"),
  q("ba-006", "Basketball", 2019, "Hard", "Who led the 2019 Toronto Raptors in total playoff scoring?", ["Kawhi Leonard", "Kyle Lowry", "Pascal Siakam", "Fred VanVleet"], 0, "Kawhi Leonard was the Raptors' leading postseason scorer and Finals MVP.", "NBA Playoffs 2019"),
  q("ba-007", "Basketball", 2020, "Legendary", "Which player won Finals MVP when the Lakers took the 2020 NBA title?", ["Anthony Davis", "LeBron James", "Jimmy Butler", "Rajon Rondo"], 1, "LeBron James won his fourth Finals MVP.", "NBA Finals 2020"),
  q("ba-008", "Basketball", 2023, "Medium", "Which franchise won its first NBA championship in 2023?", ["Denver Nuggets", "Miami Heat", "Phoenix Suns", "Milwaukee Bucks"], 0, "Denver beat Miami 4-1 to win its first title in franchise history.", "NBA Finals 2023"),
  q("ba-009", "Basketball", 1998, "Easy", "Which team did Michael Jordan play for when he won his sixth NBA title?", ["Chicago Bulls", "Washington Wizards", "Charlotte Hornets", "New York Knicks"], 0, "Jordan won his sixth ring with the Bulls in 1998.", "NBA Finals records"),
  q("ba-010", "Basketball", 2003, "Medium", "Who was selected first overall in the 2003 NBA Draft?", ["LeBron James", "Carmelo Anthony", "Dwyane Wade", "Chris Bosh"], 0, "LeBron James was the first pick by the Cleveland Cavaliers.", "NBA Draft 2003"),
  q("ba-011", "Basketball", 2014, "Hard", "Who won the 2014 NBA Finals MVP?", ["Kawhi Leonard", "Tim Duncan", "Tony Parker", "LeBron James"], 0, "Kawhi Leonard won Finals MVP as the Spurs defeated the Heat.", "NBA Finals 2014"),
  q("ba-012", "Basketball", 2021, "Legendary", "How many points did Giannis Antetokounmpo score in Game 6 of the 2021 NBA Finals?", ["50", "45", "42", "38"], 0, "Giannis scored 50 points in the championship-clinching Game 6 win.", "NBA Finals 2021 box score"),

  // ── Tennis ─────────────────────────────────────────────────
  q("te-001", "Tennis", 1990, "Easy", "Who won the 1990 Wimbledon men's singles title?", ["Stefan Edberg", "Boris Becker", "Ivan Lendl", "Andre Agassi"], 0, "Edberg defeated Becker in the final.", "Wimbledon records"),
  q("te-002", "Tennis", 1997, "Easy", "Who won the 1997 French Open men's singles title?", ["Gustavo Kuerten", "Thomas Muster", "Yevgeny Kafelnikov", "Carlos Moya"], 0, "Gustavo Kuerten won his first Grand Slam at Roland-Garros.", "French Open records"),
  q("te-003", "Tennis", 2001, "Medium", "Who defeated Pete Sampras in the 2001 US Open final?", ["Lleyton Hewitt", "Andre Agassi", "Marat Safin", "Andy Roddick"], 0, "Lleyton Hewitt beat Sampras in straight sets.", "US Open 2001"),
  q("te-004", "Tennis", 2008, "Medium", "Which Grand Slam did Rafael Nadal win in 2008 after defeating Roger Federer in an epic final?", ["US Open", "Wimbledon", "Australian Open", "French Open"], 1, "Nadal won an epic five-set Wimbledon final, often called the greatest match ever.", "Wimbledon 2008 final"),
  q("te-005", "Tennis", 2011, "Hard", "How many Grand Slam titles did Novak Djokovic win in 2011?", ["Four", "Three", "Two", "One"], 1, "Djokovic won the Australian Open, Wimbledon and US Open in 2011 — three titles.", "ATP Grand Slam records"),
  q("te-006", "Tennis", 2018, "Hard", "Who won the 2018 US Open women's singles title?", ["Serena Williams", "Naomi Osaka", "Simona Halep", "Sloane Stephens"], 1, "Naomi Osaka won her first major title in New York.", "US Open 2018"),
  q("te-007", "Tennis", 2022, "Legendary", "How many Grand Slam titles did Rafael Nadal hold after winning the 2022 Australian Open?", ["21", "22", "20", "19"], 0, "Nadal's 2022 Australian Open win was his 21st Grand Slam title, a record at the time.", "ATP records"),
  q("te-008", "Tennis", 2023, "Medium", "Who won the 2023 Wimbledon men's singles title?", ["Carlos Alcaraz", "Novak Djokovic", "Jannik Sinner", "Daniil Medvedev"], 0, "Alcaraz defeated Djokovic in five sets.", "Wimbledon 2023 final"),
  q("te-009", "Tennis", 2003, "Easy", "Who won the 2003 Wimbledon men's singles title for his first Grand Slam?", ["Roger Federer", "Andy Roddick", "Lleyton Hewitt", "Mark Philippoussis"], 0, "Roger Federer won his first of eight Wimbledon titles.", "Wimbledon records"),
  q("te-010", "Tennis", 2015, "Medium", "Who won the 2015 US Open women's singles title?", ["Flavia Pennetta", "Roberta Vinci", "Serena Williams", "Simona Halep"], 0, "Flavia Pennetta defeated Roberta Vinci in an all-Italian final.", "US Open 2015"),
  q("te-011", "Tennis", 2009, "Hard", "Who won the 2009 US Open men's singles title?", ["Juan Martin del Potro", "Roger Federer", "Rafael Nadal", "Novak Djokovic"], 0, "Del Potro upset Federer in five sets to win his only Grand Slam title.", "US Open 2009"),
  q("te-012", "Tennis", 2024, "Legendary", "Who won the most Grand Slam men's singles titles in the Open Era as of 2024?", ["Novak Djokovic", "Rafael Nadal", "Roger Federer", "Pete Sampras"], 0, "Djokovic holds the record with 24 Grand Slam singles titles.", "ATP records"),

  // ── Formula 1 ──────────────────────────────────────────────
  q("f1-001", "Formula 1", 1994, "Easy", "Who won the 1994 Formula 1 World Championship?", ["Michael Schumacher", "Damon Hill", "Alain Prost", "Nigel Mansell"], 0, "Schumacher won his first world title with Benetton.", "FIA F1 records"),
  q("f1-002", "Formula 1", 1996, "Medium", "Which driver won the 1996 F1 World Championship?", ["Michael Schumacher", "Damon Hill", "Jacques Villeneuve", "Mika Hakkinen"], 1, "Damon Hill became champion with Williams.", "FIA F1 records"),
  q("f1-003", "Formula 1", 2004, "Easy", "How many races did Michael Schumacher win in the 2004 F1 season?", ["11", "13", "14", "16"], 1, "Schumacher won 13 of the 18 Grands Prix in a dominant season.", "FIA F1 2004 season"),
  q("f1-004", "Formula 1", 2008, "Medium", "Who won the 2008 F1 World Championship?", ["Lewis Hamilton", "Felipe Massa", "Kimi Raikkonen", "Fernando Alonso"], 0, "Hamilton secured the title at the final race in Brazil by one point.", "FIA F1 2008"),
  q("f1-005", "Formula 1", 2016, "Hard", "Which driver won the 2016 F1 World Championship?", ["Sebastian Vettel", "Lewis Hamilton", "Nico Rosberg", "Daniel Ricciardo"], 2, "Nico Rosberg beat teammate Hamilton by five points and then retired.", "FIA F1 2016"),
  q("f1-006", "Formula 1", 2021, "Hard", "At which Grand Prix was the 2021 F1 drivers' championship decided?", ["Monaco GP", "Abu Dhabi GP", "British GP", "Italian GP"], 1, "The championship was decided at Abu Dhabi after a dramatic last-lap finish.", "FIA F1 2021"),
  q("f1-007", "Formula 1", 2023, "Legendary", "How many Grands Prix did Max Verstappen win in the 2023 F1 season?", ["17", "19", "15", "21"], 1, "Max Verstappen won 19 of 22 races, a record for most wins in a season.", "FIA F1 2023 season"),
  q("f1-008", "Formula 1", 2024, "Medium", "Which team won the 2024 F1 constructors' championship?", ["Ferrari", "McLaren", "Red Bull Racing", "Mercedes"], 1, "McLaren won the constructors' title in 2024.", "FIA F1 2024"),
  q("f1-009", "Formula 1", 2000, "Easy", "Who won the 2000 F1 World Championship — the first title for Ferrari since 1979?", ["Michael Schumacher", "Mika Hakkinen", "David Coulthard", "Rubens Barrichello"], 0, "Schumacher won Ferrari's first drivers' title in 21 years.", "FIA F1 records"),
  q("f1-010", "Formula 1", 2010, "Medium", "Who won the 2010 F1 World Championship?", ["Sebastian Vettel", "Fernando Alonso", "Mark Webber", "Lewis Hamilton"], 0, "Sebastian Vettel became the youngest World Champion at 23.", "FIA F1 2010"),
  q("f1-011", "Formula 1", 2007, "Hard", "Who won the 2007 F1 World Championship?", ["Lewis Hamilton", "Fernando Alonso", "Kimi Raikkonen", "Felipe Massa"], 2, "Kimi Raikkonen won the title by a single point over Hamilton and Alonso.", "FIA F1 2007"),
  q("f1-012", "Formula 1", 2014, "Legendary", "How many consecutive constructors' championships did Mercedes win starting from 2014?", ["6", "7", "8", "5"], 2, "Mercedes won eight consecutive constructors' titles from 2014 to 2021.", "FIA F1 records"),

  // ── Badminton ──────────────────────────────────────────────
  q("bd-001", "Badminton", 1992, "Easy", "In which year did badminton make its full Olympic debut as a medal sport?", ["1988", "1992", "1996", "2000"], 1, "Badminton became a full medal sport at Barcelona 1992.", "Olympic records"),
  q("bd-002", "Badminton", 2001, "Medium", "Which country has historically dominated men's singles at the BWF World Championships?", ["China", "India", "Denmark", "Indonesia"], 0, "China has produced the most men's singles world champions.", "BWF World Championships records"),
  q("bd-003", "Badminton", 2008, "Easy", "Who won the men's singles badminton gold at Beijing 2008?", ["Lin Dan", "Lee Chong Wei", "Taufik Hidayat", "Peter Gade"], 0, "Lin Dan beat Lee Chong Wei in the final.", "Olympic records 2008"),
  q("bd-004", "Badminton", 2012, "Medium", "Which Indian player won the 2012 Olympic women's singles bronze?", ["Saina Nehwal", "PV Sindhu", "Jwala Gutta", "Ashwini Ponnappa"], 0, "Saina Nehwal won India's first Olympic badminton medal.", "Olympic records 2012"),
  q("bd-005", "Badminton", 2016, "Medium", "Who won the men's singles badminton gold at Rio 2016?", ["Chen Long", "Lin Dan", "Victor Axelsen", "Lee Chong Wei"], 0, "Chen Long defeated Lee Chong Wei in the final.", "Olympic records 2016"),
  q("bd-006", "Badminton", 2019, "Hard", "Who won the 2019 BWF World Championships men's singles title?", ["Kento Momota", "Viktor Axelsen", "Anthony Ginting", "Chen Long"], 0, "Kento Momota successfully defended the men's singles world title in Basel.", "BWF World Championships 2019"),
  q("bd-007", "Badminton", 2021, "Legendary", "Who won the men's singles badminton gold at Tokyo 2020?", ["Viktor Axelsen", "Chen Long", "Kento Momota", "Anders Antonsen"], 0, "Viktor Axelsen won the Tokyo title decisively.", "Olympic records 2020"),
  q("bd-008", "Badminton", 2023, "Hard", "Who won the 2023 BWF World Championships women's singles title?", ["PV Sindhu", "Akane Yamaguchi", "Carolina Marin", "An Se-young"], 3, "An Se-young won her first world title in Copenhagen.", "BWF World Championships 2023"),
  q("bd-009", "Badminton", 2016, "Easy", "Which Indian shuttler won a silver medal in women's singles at Rio 2016?", ["PV Sindhu", "Saina Nehwal", "Jwala Gutta", "Carolina Marin"], 0, "PV Sindhu won the silver medal, losing to Carolina Marin in the final.", "Olympic records 2016"),
  q("bd-010", "Badminton", 2014, "Hard", "Which country won the most gold medals at the 2014 BWF World Championships?", ["China", "Japan", "Indonesia", "South Korea"], 0, "China won the most gold medals at the 2014 World Championships in Copenhagen.", "BWF World Championships 2014"),

  // ── Hockey ─────────────────────────────────────────────────
  q("ho-001", "Hockey", 1992, "Easy", "Which country won the men's field hockey gold at the 1992 Olympics?", ["Germany", "Netherlands", "Pakistan", "Australia"], 0, "Germany won the Barcelona men's hockey title.", "Olympic records"),
  q("ho-002", "Hockey", 1998, "Easy", "Which country hosted the 1998 men's FIH Hockey World Cup?", ["Netherlands", "Malaysia", "Australia", "England"], 1, "The 1998 Hockey World Cup was held in Malaysia.", "FIH records"),
  q("ho-003", "Hockey", 2004, "Medium", "Which country won the men's Olympic hockey gold at Athens 2004?", ["Germany", "Australia", "Netherlands", "Pakistan"], 0, "Germany beat Australia in a shoot-out.", "Olympic records 2004"),
  q("ho-004", "Hockey", 2010, "Medium", "Which country won the 2010 men's Hockey World Cup?", ["Germany", "Australia", "Netherlands", "Spain"], 1, "Australia won the final in New Delhi.", "FIH World Cup 2010"),
  q("ho-005", "Hockey", 2012, "Hard", "Which country won the 2012 Olympic men's hockey title?", ["Germany", "Belgium", "Netherlands", "Australia"], 0, "Germany defeated the Netherlands in London.", "Olympic records 2012"),
  q("ho-006", "Hockey", 2016, "Hard", "Which country won the 2016 Olympic men's hockey gold?", ["Germany", "Argentina", "Netherlands", "Belgium"], 1, "Argentina beat Belgium in the final at Rio.", "Olympic records 2016"),
  q("ho-007", "Hockey", 2021, "Legendary", "Which team won the men's Olympic hockey gold at Tokyo 2020?", ["India", "Belgium", "Australia", "Germany"], 1, "Belgium won its first men's Olympic hockey gold in Tokyo.", "Olympic records 2020"),
  q("ho-008", "Hockey", 2023, "Medium", "Which country won the 2023 men's Hockey World Cup?", ["Germany", "Belgium", "Netherlands", "India"], 0, "Germany won the title on penalties against Belgium in Bhubaneswar.", "FIH World Cup 2023"),
  q("ho-009", "Hockey", 2006, "Easy", "Which country won the 2006 men's Hockey World Cup?", ["Germany", "Australia", "Spain", "Netherlands"], 0, "Germany won the 2006 World Cup in Mönchengladbach.", "FIH records"),
  q("ho-010", "Hockey", 2014, "Medium", "Which country won the 2014 men's Hockey World Cup?", ["Australia", "Netherlands", "Germany", "India"], 0, "Australia won the 2014 World Cup in The Hague.", "FIH World Cup 2014"),

  // ── Athletics ──────────────────────────────────────────────
  q("at-001", "Athletics", 1996, "Easy", "Who won the men's 100m gold at the 1996 Atlanta Olympics?", ["Donovan Bailey", "Linford Christie", "Frankie Fredericks", "Ato Boldon"], 0, "Donovan Bailey of Canada won in a world record time of 9.84 seconds.", "Olympic records 1996"),
  q("at-002", "Athletics", 2008, "Easy", "Who won the men's 100m gold at the 2008 Beijing Olympics?", ["Usain Bolt", "Tyson Gay", "Asafa Powell", "Richard Thompson"], 0, "Usain Bolt won in a world record time of 9.69 seconds.", "Olympic records 2008"),
  q("at-003", "Athletics", 2009, "Medium", "What world record did Usain Bolt set in the 100m at the 2009 World Championships?", ["9.58", "9.69", "9.72", "9.63"], 0, "Bolt ran 9.58 seconds in Berlin, a record that still stands.", "IAAF World Championships 2009"),
  q("at-004", "Athletics", 2012, "Medium", "Who won the women's 100m gold at the 2012 London Olympics?", ["Shelly-Ann Fraser-Pryce", "Carmelita Jeter", "Veronica Campbell-Brown", "Allyson Felix"], 0, "Shelly-Ann Fraser-Pryce successfully defended her Olympic 100m title.", "Olympic records 2012"),
  q("at-005", "Athletics", 2016, "Hard", "Who won the men's marathon gold at the 2016 Rio Olympics?", ["Eliud Kipchoge", "Feyisa Lilesa", "Galen Rupp", "Kenenisa Bekele"], 0, "Eliud Kipchoge won his first Olympic marathon gold.", "Olympic records 2016"),
  q("at-006", "Athletics", 2019, "Hard", "Who broke the two-hour marathon barrier in 2019, although it was not an official record?", ["Eliud Kipchoge", "Kenenisa Bekele", "Mo Farah", "Geoffrey Kamworor"], 0, "Kipchoge ran 1:59:40 at the INEOS 1:59 Challenge in Vienna.", "INEOS 1:59 Challenge"),
  q("at-007", "Athletics", 2022, "Legendary", "What world record did Sydney McLaughlin-Levrone set in the 400m hurdles at the 2022 World Championships?", ["50.68", "51.41", "51.46", "50.44"], 0, "McLaughlin-Levrone ran 50.68 seconds, breaking her own world record.", "World Athletics Championships 2022"),
  q("at-008", "Athletics", 2023, "Medium", "Who won the men's 100m gold at the 2023 World Championships in Budapest?", ["Noah Lyles", "Fred Kerley", "Oblique Seville", "Zharnel Hughes"], 0, "Noah Lyles won the 100m world title.", "World Athletics Championships 2023"),
  q("at-009", "Athletics", 1993, "Easy", "In which event did Carl Lewis compete in as an Olympic gold medalist?", ["Long jump and sprints", "Decathlon", "400m hurdles", "Triple jump"], 0, "Carl Lewis won Olympic golds in the long jump and sprint events.", "Olympic records"),
  q("at-010", "Athletics", 2004, "Medium", "Who won the women's 400m gold at the 2004 Athens Olympics?", ["Tonique Williams-Darling", "Ana Guevara", "Natalya Antyukh", "Sanya Richards"], 0, "Tonique Williams-Darling of the Bahamas won the 400m gold.", "Olympic records 2004"),
  q("at-011", "Athletics", 2017, "Hard", "Who won the men's 100m at the 2017 World Championships, beating Usain Bolt in his final individual race?", ["Justin Gatlin", "Christian Coleman", "Yohan Blake", "Andre De Grasse"], 0, "Justin Gatlin won the gold, with Bolt finishing third in his farewell race.", "IAAF World Championships 2017"),
  q("at-012", "Athletics", 2024, "Legendary", "Who won the men's 100m gold at the 2024 Paris Olympics?", ["Noah Lyles", "Kishane Thompson", "Fred Kerley", "Oblique Seville"], 0, "Noah Lyles won the Olympic 100m title by five thousandths of a second.", "Olympic records 2024"),
];
