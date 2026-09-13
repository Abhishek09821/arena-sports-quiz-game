export type Sport = "Cricket" | "Football" | "Basketball" | "Tennis" | "Formula 1" | "Badminton" | "Hockey" | "Olympics";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Legendary";

export type Question = {
  id: string;
  sport: Sport;
  year: number;
  difficulty: Difficulty;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

const q = (id: string, sport: Sport, year: number, difficulty: Difficulty, question: string, options: string[], answer: number, explanation: string): Question => ({ id, sport, year, difficulty, question, options, answer, explanation });

export const QUESTIONS: Question[] = [
  q("cr-001", "Cricket", 1992, "Easy", "Which country won the 1992 Cricket World Cup?", ["Australia", "Pakistan", "England", "South Africa"], 1, "Pakistan defeated England in the final in Melbourne."),
  q("cr-002", "Cricket", 1996, "Easy", "Which team won the 1996 Cricket World Cup?", ["Sri Lanka", "India", "Pakistan", "Australia"], 0, "Sri Lanka beat Australia in Lahore."),
  q("cr-003", "Cricket", 2007, "Medium", "Who captained India during the 2007 inaugural T20 World Cup?", ["Rahul Dravid", "Sourav Ganguly", "MS Dhoni", "Anil Kumble"], 2, "MS Dhoni led India to the title in the inaugural T20 World Cup."),
  q("cr-004", "Cricket", 2011, "Medium", "Where was the 2011 Cricket World Cup final played?", ["Kolkata", "Mumbai", "Delhi", "Chennai"], 1, "The final was played at Wankhede Stadium in Mumbai."),
  q("cr-005", "Cricket", 2019, "Hard", "Who scored England's highest individual score in the 2019 World Cup final?", ["Joe Root", "Jos Buttler", "Ben Stokes", "Jason Roy"], 2, "Ben Stokes made 84 in England's tied chase before the Super Over."),
  q("cr-006", "Cricket", 2023, "Legendary", "Which Australian bowler took the decisive wicket of Rohit Sharma in the 2023 ODI World Cup final?", ["Mitchell Starc", "Josh Hazlewood", "Pat Cummins", "Glenn Maxwell"], 2, "Pat Cummins removed Rohit Sharma and finished with figures of 2/34."),
  q("cr-007", "Cricket", 2005, "Hard", "Which Ashes series venue hosted the famous 2005 Edgbaston Test?", ["Headingley", "Trent Bridge", "Edgbaston", "The Oval"], 2, "England won at Edgbaston by just two runs."),
  q("cr-008", "Cricket", 2014, "Medium", "Who won the 2014 men's ICC World Twenty20?", ["Sri Lanka", "India", "West Indies", "Australia"], 0, "Sri Lanka defeated India in the final in Dhaka."),

  q("fb-001", "Football", 1994, "Easy", "Which nation won the 1994 FIFA World Cup?", ["Brazil", "Italy", "Germany", "Argentina"], 0, "Brazil beat Italy on penalties in Pasadena."),
  q("fb-002", "Football", 1998, "Easy", "Who won the 1998 FIFA World Cup?", ["France", "Brazil", "Germany", "Croatia"], 0, "France beat Brazil 3-0 in the final."),
  q("fb-003", "Football", 2002, "Medium", "Who finished as the top scorer at the 2002 FIFA World Cup?", ["Ronaldo", "Miroslav Klose", "Rivaldo", "Christian Vieri"], 0, "Brazilian striker Ronaldo scored eight goals."),
  q("fb-004", "Football", 2010, "Medium", "Who scored the winning goal in the 2010 FIFA World Cup final?", ["David Villa", "Andres Iniesta", "Xavi", "Fernando Torres"], 1, "Andres Iniesta scored in extra time against the Netherlands."),
  q("fb-005", "Football", 2014, "Hard", "Which goalkeeper won the Golden Glove at the 2014 World Cup?", ["Manuel Neuer", "Iker Casillas", "Keylor Navas", "Sergio Romero"], 0, "Manuel Neuer was awarded the Golden Glove."),
  q("fb-006", "Football", 2018, "Hard", "Which team reached its first World Cup final in 2018?", ["Belgium", "Croatia", "England", "Portugal"], 1, "Croatia reached the final for the first time."),
  q("fb-007", "Football", 2022, "Legendary", "Which player scored the opening goal of the 2022 World Cup final?", ["Lionel Messi", "Angel Di Maria", "Kylian Mbappe", "Olivier Giroud"], 0, "Messi scored from the penalty spot in the 23rd minute."),
  q("fb-008", "Football", 2023, "Medium", "Which club won the 2022-23 UEFA Champions League?", ["Real Madrid", "Manchester City", "Inter Milan", "Bayern Munich"], 1, "Manchester City beat Inter 1-0 in Istanbul."),

  q("ba-001", "Basketball", 1992, "Easy", "Which NBA team won the 1991-92 championship?", ["Chicago Bulls", "Portland Trail Blazers", "Los Angeles Lakers", "Utah Jazz"], 0, "The Bulls won their second straight NBA title."),
  q("ba-002", "Basketball", 1996, "Medium", "Which team selected Kobe Bryant in the 1996 NBA Draft?", ["Los Angeles Lakers", "Charlotte Hornets", "Philadelphia 76ers", "Boston Celtics"], 1, "Charlotte selected Bryant at No. 13 and traded him to the Lakers."),
  q("ba-003", "Basketball", 2001, "Easy", "Who won the 2000-01 NBA MVP award?", ["Shaquille O'Neal", "Kobe Bryant", "Allen Iverson", "Tim Duncan"], 2, "Allen Iverson was the regular-season MVP."),
  q("ba-004", "Basketball", 2008, "Medium", "Which team did the Boston Celtics defeat in the 2008 NBA Finals?", ["Lakers", "Cavaliers", "Spurs", "Magic"], 0, "Boston beat the Los Angeles Lakers 4-2."),
  q("ba-005", "Basketball", 2016, "Hard", "Which team overcame a 3-1 Finals deficit to win the 2016 NBA title?", ["Cavaliers", "Warriors", "Thunder", "Raptors"], 0, "Cleveland became the first team to erase a 3-1 Finals deficit."),
  q("ba-006", "Basketball", 2019, "Hard", "Who led the 2019 Toronto Raptors in total playoff points?", ["Kawhi Leonard", "Kyle Lowry", "Pascal Siakam", "Fred VanVleet"], 0, "Kawhi Leonard was the Raptors' main postseason scorer."),
  q("ba-007", "Basketball", 2020, "Legendary", "Which player won Finals MVP when the Lakers took the 2020 NBA title?", ["Anthony Davis", "LeBron James", "Jimmy Butler", "Rajon Rondo"], 1, "LeBron James won his fourth Finals MVP."),
  q("ba-008", "Basketball", 2023, "Medium", "Which franchise won its first NBA championship in 2023?", ["Denver Nuggets", "Miami Heat", "Phoenix Suns", "Milwaukee Bucks"], 0, "Denver beat Miami 4-1 to win its first title."),

  q("te-001", "Tennis", 1990, "Easy", "Who won the 1990 Wimbledon men's singles title?", ["Stefan Edberg", "Boris Becker", "Ivan Lendl", "Andre Agassi"], 0, "Edberg defeated Becker in the final."),
  q("te-002", "Tennis", 1997, "Easy", "Who won the 1997 French Open men's singles title?", ["Gustavo Kuerten", "Thomas Muster", "Yevgeny Kafelnikov", "Carlos Moya"], 0, "Gustavo Kuerten won his first Grand Slam at Roland-Garros."),
  q("te-003", "Tennis", 2001, "Medium", "Who defeated Pete Sampras in the 2001 US Open final?", ["Lleyton Hewitt", "Andre Agassi", "Marat Safin", "Andy Roddick"], 0, "Lleyton Hewitt beat Sampras in straight sets."),
  q("te-004", "Tennis", 2008, "Medium", "Which Grand Slam did Rafael Nadal win in 2008 after defeating Roger Federer in the final?", ["US Open", "Wimbledon", "Australian Open", "French Open"], 1, "Nadal won an epic five-set Wimbledon final."),
  q("te-005", "Tennis", 2011, "Hard", "Who won all four Grand Slam finals against different opponents in 2011?", ["Novak Djokovic", "Rafael Nadal", "Roger Federer", "Andy Murray"], 0, "Djokovic won the Australian, Wimbledon and US Open titles in 2011, with no French Open title."),
  q("te-006", "Tennis", 2018, "Hard", "Who won the 2018 US Open women's singles title?", ["Serena Williams", "Naomi Osaka", "Simona Halep", "Sloane Stephens"], 1, "Naomi Osaka won her first major title in New York."),
  q("te-007", "Tennis", 2022, "Legendary", "Which player completed a career Grand Slam by winning the 2022 Australian Open?", ["Rafael Nadal", "Daniil Medvedev", "Novak Djokovic", "Andy Murray"], 0, "Nadal's 2022 Australian Open win gave him the career Grand Slam again and a record 21st major at the time."),
  q("te-008", "Tennis", 2023, "Medium", "Who won the 2023 Wimbledon men's singles title?", ["Carlos Alcaraz", "Novak Djokovic", "Jannik Sinner", "Daniil Medvedev"], 0, "Alcaraz defeated Djokovic in five sets."),

  q("f1-001", "Formula 1", 1994, "Easy", "Who won the 1994 Formula 1 World Championship?", ["Michael Schumacher", "Damon Hill", "Alain Prost", "Nigel Mansell"], 0, "Schumacher won his first world title."),
  q("f1-002", "Formula 1", 1996, "Medium", "Which driver won the 1996 F1 World Championship?", ["Michael Schumacher", "Damon Hill", "Jacques Villeneuve", "Mika Hakkinen"], 1, "Damon Hill became champion with Williams."),
  q("f1-003", "Formula 1", 2004, "Easy", "How many races did Michael Schumacher win in the 2004 F1 season?", ["11", "13", "14", "16"], 1, "Schumacher won 13 of the 18 Grands Prix."),
  q("f1-004", "Formula 1", 2008, "Medium", "Who won the 2008 F1 World Championship?", ["Lewis Hamilton", "Felipe Massa", "Kimi Raikkonen", "Fernando Alonso"], 0, "Hamilton secured the title at the final race in Brazil."),
  q("f1-005", "Formula 1", 2016, "Hard", "Which driver won the 2016 F1 World Championship?", ["Sebastian Vettel", "Lewis Hamilton", "Nico Rosberg", "Daniel Ricciardo"], 2, "Nico Rosberg beat teammate Hamilton by five points."),
  q("f1-006", "Formula 1", 2021, "Hard", "Which race decided the 2021 F1 drivers' championship?", ["Monaco GP", "Abu Dhabi GP", "British GP", "Italian GP"], 1, "The championship was decided in Abu Dhabi after a dramatic finale."),
  q("f1-007", "Formula 1", 2023, "Legendary", "Which driver won the most Grands Prix in the 2023 F1 season?", ["Max Verstappen", "Sergio Perez", "Lewis Hamilton", "Fernando Alonso"], 0, "Max Verstappen won 19 of 22 races."),
  q("f1-008", "Formula 1", 2024, "Medium", "Which team won the 2024 F1 constructors' championship?", ["Ferrari", "McLaren", "Red Bull Racing", "Mercedes"], 1, "McLaren won the constructors' title."),

  q("bd-001", "Badminton", 1992, "Easy", "When did badminton make its full Olympic debut as a medal sport?", ["1988", "1992", "1996", "2000"], 1, "Badminton became a full medal sport at Barcelona 1992."),
  q("bd-002", "Badminton", 2001, "Medium", "Which country has historically dominated men's singles at the World Championships?", ["China", "India", "Denmark", "Indonesia"], 0, "China has produced a large share of men's singles world champions."),
  q("bd-003", "Badminton", 2008, "Easy", "Who won the men's singles badminton gold at Beijing 2008?", ["Lin Dan", "Lee Chong Wei", "Taufik Hidayat", "Peter Gade"], 0, "Lin Dan beat Lee Chong Wei in the final."),
  q("bd-004", "Badminton", 2012, "Medium", "Which Indian player won the 2012 Olympic women's singles bronze?", ["Saina Nehwal", "PV Sindhu", "Jwala Gutta", "Ashwini Ponnappa"], 0, "Saina Nehwal won India's first Olympic badminton medal."),
  q("bd-005", "Badminton", 2016, "Medium", "Who won the 2016 Olympic men's singles title?", ["Chen Long", "Lin Dan", "Victor Axelsen", "Lee Chong Wei"], 0, "Chen Long defeated Lee Chong Wei in Rio."),
  q("bd-006", "Badminton", 2019, "Hard", "Who won the 2019 BWF World Championships men's singles title?", ["Kento Momota", "Viktor Axelsen", "Anthony Ginting", "Chen Long"], 0, "Kento Momota successfully defended the men's singles world title in Basel."),
  q("bd-007", "Badminton", 2021, "Legendary", "Which player won the 2021 Olympic men's singles badminton gold?", ["Viktor Axelsen", "Chen Long", "Kento Momota", "Anders Antonsen"], 0, "Viktor Axelsen won the Tokyo title."),
  q("bd-008", "Badminton", 2023, "Hard", "Who won the 2023 World Championships women's singles title?", ["PV Sindhu", "Akane Yamaguchi", "Carolina Marin", "An Se-young"], 3, "An Se-young won her first world title in Copenhagen."),

  q("ho-001", "Hockey", 1992, "Easy", "Which country won the men's field hockey gold at the 1992 Olympics?", ["Germany", "Netherlands", "Pakistan", "Australia"], 0, "Germany won the Barcelona men's hockey title."),
  q("ho-002", "Hockey", 1998, "Easy", "Which city hosted the 1998 men's FIH Hockey World Cup?", ["Utrecht", "Kuala Lumpur", "Sydney", "London"], 1, "The tournament was held in Kuala Lumpur."),
  q("ho-003", "Hockey", 2004, "Medium", "Which country won the men's Olympic hockey gold at Athens 2004?", ["Germany", "Australia", "Netherlands", "Pakistan"], 0, "Germany beat the Netherlands in a shoot-out."),
  q("ho-004", "Hockey", 2010, "Medium", "Who won the 2010 men's Hockey World Cup?", ["Germany", "Australia", "Netherlands", "Spain"], 1, "Australia won the final in New Delhi."),
  q("ho-005", "Hockey", 2012, "Hard", "Which country won the 2012 Olympic men's hockey title?", ["Germany", "Belgium", "Netherlands", "Australia"], 0, "Germany defeated the Netherlands in London."),
  q("ho-006", "Hockey", 2016, "Hard", "Which country won the 2016 Olympic men's hockey gold?", ["Germany", "Argentina", "Netherlands", "Belgium"], 1, "Argentina beat Belgium in the final."),
  q("ho-007", "Hockey", 2021, "Legendary", "Which team ended a long Olympic men's hockey gold drought by winning in Tokyo?", ["India", "Belgium", "Australia", "Germany"], 1, "Belgium won its first men's Olympic hockey gold in Tokyo."),
  q("ho-008", "Hockey", 2023, "Medium", "Which country won the 2023 men's Hockey World Cup?", ["Germany", "Belgium", "Netherlands", "India"], 0, "Germany won the title on penalties against Belgium."),

  q("ol-001", "Olympics", 1992, "Easy", "Which city hosted the 1992 Summer Olympics?", ["Barcelona", "Seoul", "Atlanta", "Sydney"], 0, "Barcelona hosted the 1992 Summer Olympics."),
  q("ol-002", "Olympics", 1996, "Easy", "Which city hosted the 1996 Summer Olympics?", ["Athens", "Atlanta", "Sydney", "Barcelona"], 1, "Atlanta hosted the centennial Summer Olympics."),
  q("ol-003", "Olympics", 2000, "Medium", "Which city hosted the 2000 Summer Olympics?", ["Sydney", "Beijing", "Athens", "Seoul"], 0, "Sydney hosted the 2000 Games."),
  q("ol-004", "Olympics", 2008, "Easy", "Which city hosted the 2008 Summer Olympics?", ["Beijing", "London", "Athens", "Tokyo"], 0, "Beijing hosted the 2008 Games."),
  q("ol-005", "Olympics", 2012, "Medium", "Where were the 2012 Summer Olympics held?", ["London", "Rio de Janeiro", "Beijing", "Athens"], 0, "London hosted its third Summer Olympics."),
  q("ol-006", "Olympics", 2016, "Medium", "Which city hosted the 2016 Summer Olympics?", ["Rio de Janeiro", "Tokyo", "London", "Paris"], 0, "Rio de Janeiro hosted the first Olympics in South America."),
  q("ol-007", "Olympics", 2020, "Hard", "Why were the Tokyo 2020 Olympics held in 2021?", ["A weather delay", "A global pandemic", "A host-city strike", "Construction delays"], 1, "COVID-19 caused the Games to be postponed by one year."),
  q("ol-008", "Olympics", 2024, "Legendary", "Which city hosted the 2024 Summer Olympics?", ["Los Angeles", "Paris", "Brisbane", "Rome"], 1, "Paris hosted the 2024 Summer Olympics."),
];

export const SPORTS = [
  { name: "Cricket", icon: "🏏" },
  { name: "Football", icon: "⚽" },
  { name: "Basketball", icon: "🏀" },
  { name: "Tennis", icon: "🎾" },
  { name: "Formula 1", icon: "🏎️" },
  { name: "Badminton", icon: "🏸" },
  { name: "Hockey", icon: "🏑" },
  { name: "Olympics", icon: "🏅" },
] as const;
