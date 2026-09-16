import { type Sport, type Difficulty, SPORT_LIST } from "@/data/questions";
import { RawGeneratedQuestion } from "./question_validator";

export interface GenerateOptions {
  sport: Sport | "All Sports";
  difficulty: Difficulty | "Mixed";
  count: number;
  category?: string;
  excludeStems?: string[];
  excludeAnswers?: string[];
  mode?: "classic" | "challenge" | "sprint" | "multiplayer";
}

/**
 * Detailed factual ground-truth knowledge anchors for each tournament and league.
 * Supplies exact years, champions, runner-ups, and statistical benchmarks to eliminate hallucinations.
 */
function getTournamentContext(tournament?: string): string {
  if (!tournament || tournament.startsWith("All")) return "";
  const t = tournament.toLowerCase();

  if (t.includes("ipl") || t.includes("indian premier league")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Indian Premier League (IPL)":
- Era: 2008 to 2024.
- Real Champions & Finalists:
  2008: Rajasthan Royals beat CSK
  2009: Deccan Chargers beat RCB
  2010: CSK beat MI
  2011: CSK beat RCB
  2012: KKR beat CSK
  2013: MI beat CSK
  2014: KKR beat KXIP
  2015: MI beat CSK
  2016: Sunrisers Hyderabad beat RCB (SRH won their maiden title; Virat Kohli scored 973 runs)
  2017: MI beat Rising Pune Supergiant (by 1 run)
  2018: CSK beat SRH (Shane Watson 117* in final)
  2019: MI beat CSK (by 1 run, Malinga yorker to Shardul)
  2020: MI beat Delhi Capitals
  2021: CSK beat KKR
  2022: Gujarat Titans beat RR (Hardik Pandya captaincy)
  2023: CSK beat GT (Ravindra Jadeja hit 10 off last 2 balls in rain-affected match)
  2024: KKR beat SRH (Mitchell Starc spell, Shreyas Iyer captaincy)
- ZERO TITLES (Never say these won IPL): Royal Challengers Bangalore (RCB), Delhi Capitals (DC), Punjab Kings (PBKS), Lucknow Super Giants (LSG).
- Key Records: Chris Gayle 175* off 66 balls in 2013 (highest score). SRH 287/3 in 2024 (highest team total). Virat Kohli 973 runs in 2016 (most runs in a season). Dwayne Bravo & Harshal Patel 32 wickets in a season (most wickets). Yuzvendra Chahal all-time highest wicket-taker. Virat Kohli all-time highest run-scorer.`;
  }

  if (t.includes("champions league") || t.includes("ucl")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "UEFA Champions League":
- Era: 1975 to 2024.
- Real Champions & Finalists (recent decades):
  2024: Real Madrid beat Borussia Dortmund 2-0 (Carvajal, Vinicius Jr)
  2023: Manchester City beat Inter Milan 1-0 (Rodri goal, European treble)
  2022: Real Madrid beat Liverpool 1-0 (Vinicius Jr, Courtois MoM)
  2021: Chelsea beat Manchester City 1-0 (Kai Havertz goal)
  2020: Bayern Munich beat PSG 1-0 (Kingsley Coman goal)
  2019: Liverpool beat Tottenham 2-0 (Salah pen, Origi)
  2018: Real Madrid beat Liverpool 3-1 (Bale bicycle kick & brace)
  2017: Real Madrid beat Juventus 4-1 (Ronaldo brace)
  2016: Real Madrid beat Atletico Madrid on penalties (1-1 AET)
  2015: Barcelona beat Juventus 3-1 (Rakitic, Suarez, Neymar - treble)
  2014: Real Madrid beat Atletico Madrid 4-1 AET (Sergio Ramos 92:48 header, La Decima)
  2013: Bayern Munich beat Borussia Dortmund 2-1 (Robben 89th min)
  2012: Chelsea beat Bayern Munich on penalties in Munich (Drogba late equalizer & winning pen)
  2011: Barcelona beat Manchester United 3-1 at Wembley (Pedro, Messi, Villa)
  2010: Inter Milan beat Bayern Munich 2-0 (Milito brace - Mourinho treble)
  2009: Barcelona beat Manchester United 2-0 in Rome (Eto'o, Messi)
  2008: Manchester United beat Chelsea on penalties in Moscow (Terry slip)
  2005: Liverpool beat AC Milan on penalties (Miracle of Istanbul, from 0-3 down to 3-3)
  1999: Manchester United beat Bayern Munich 2-1 (Sheringham 91', Solskjaer 93' stoppage-time treble)
- ZERO TITLES (Never name these as UCL champions): Paris Saint-Germain (PSG), Arsenal, Atletico Madrid, Tottenham Hotspur.
- All-time top scorer: Cristiano Ronaldo (140 goals), Lionel Messi (129), Robert Lewandowski.`;
  }

  if (t.includes("fifa world cup") || (t.includes("world cup") && !t.includes("t20") && !t.includes("cricket"))) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "FIFA World Cup":
- Real Champions & Finalists (1975-2024):
  1978: Argentina beat Netherlands 3-1 AET (Kempes)
  1982: Italy beat West Germany 3-1 (Paolo Rossi)
  1986: Argentina beat West Germany 3-2 (Maradona captain)
  1990: West Germany beat Argentina 1-0 (Brehme penalty)
  1994: Brazil beat Italy 0-0 AET, 3-2 on penalties (Baggio missed over bar)
  1998: France beat Brazil 3-0 (Zidane two headers, Petit)
  2002: Brazil beat Germany 2-0 (Ronaldo Nazario brace, Kahn error)
  2006: Italy beat France 1-1 AET, 5-3 on penalties (Zidane headbutt on Materazzi, Grosso winning pen)
  2010: Spain beat Netherlands 1-0 AET (Iniesta 116th minute, Johannesburg)
  2014: Germany beat Argentina 1-0 AET (Mario Gotze 113th minute, Rio)
  2018: France beat Croatia 4-2 (Griezmann, Pogba, Mbappe)
  2022: Argentina beat France 3-3 AET, 4-2 on penalties (Messi brace, Mbappe hat-trick, Martinez save)
- Records: Miroslav Klose 16 all-time goals. Pele only player with 3 World Cups.`;
  }

  if (t.includes("premier league")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Premier League":
- Era: 1992 to 2024.
- Champions: Manchester United (13 titles), Manchester City (8 titles, 4-in-a-row 2021-2024), Chelsea (5), Arsenal (3 - 2003-04 Invincibles 38 games unbeaten), Blackburn Rovers (1994-95), Leicester City (2015-16 miracle under Ranieri), Liverpool (2019-20 under Klopp).
- Records: Alan Shearer 260 goals (all-time top scorer). Erling Haaland 36 goals in 2022-23 (single-season record). Ryan Giggs 162 assists (most assists). Man City 100 points in 2017-18 ("Centurions").`;
  }

  if (t.includes("la liga")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "La Liga":
- Champions: Real Madrid (36 titles), Barcelona (27 titles), Atletico Madrid (11 titles, 2014 & 2021 under Simeone), Valencia (2002, 2004 under Benitez), Deportivo La Coruna (2000).
- Records: Lionel Messi 474 goals (all-time top scorer for Barcelona). Cristiano Ronaldo 311 goals (in 292 games for Real Madrid). Centurion seasons: Real Madrid 2011-12 (Mourinho, 100 pts), Barcelona 2012-13 (Vilanova, 100 pts).`;
  }

  if (t.includes("euro") || t.includes("european championship")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "UEFA European Championship":
- Champions: 1976 Czechoslovakia (Panenka penalty), 1980 West Germany, 1984 France (Platini 9 goals record), 1988 Netherlands (Van Basten volley vs USSR), 1992 Denmark (fairy tale winners after Yugoslavia ban), 1996 Germany (Bierhoff golden goal vs Czech Rep), 2000 France (Trezeguet golden goal vs Italy), 2004 Greece (Angelos Charisteas beat Portugal 1-0 shock), 2008 Spain (Torres vs Germany 1-0), 2012 Spain (beat Italy 4-0), 2016 Portugal (Eder 109th min vs France 1-0), 2020 Italy (beat England on penalties at Wembley), 2024 Spain (Oyarzabal 86' beat England 2-1).`;
  }

  if (t.includes("copa")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Copa América":
- Champions: Argentina (16 titles, won 2021 in Maracana & 2024 in Miami), Uruguay (15 titles, won 2011), Brazil (9 titles, won 2019, 2007, 2004, 1999, 1997, 1989), Chile (2015, 2016 Centenario - both on penalties vs Argentina), Colombia (2001).`;
  }

  if (t.includes("t20 world cup")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "ICC Men's T20 World Cup":
- Champions & Key Moments:
  2007: India beat Pakistan (Dhoni captaincy, Joginder Sharma to Misbah scoop)
  2009: Pakistan beat Sri Lanka at Lord's (Younis Khan captain, Shahid Afridi MoM)
  2010: England beat Australia in Barbados (Paul Collingwood, Kevin Pietersen Player of Tournament)
  2012: West Indies beat Sri Lanka in Colombo (Marlon Samuels 78)
  2014: Sri Lanka beat India in Mirpur (Sangakkara 52*, Malinga captain)
  2016: West Indies beat England in Kolkata (Carlos Brathwaite 4 sixes off Ben Stokes)
  2021: Australia beat New Zealand in Dubai (Mitchell Marsh 77*, David Warner Player of Tournament)
  2022: England beat Pakistan in Melbourne (Sam Curran 3/12 MoM & Player of Tournament, Ben Stokes 52*)
  2024: India beat South Africa in Barbados (Rohit Sharma captain, Virat Kohli 76, Bumrah 2/18, Surya catch)`;
  }

  if (t.includes("cricket world cup") || t.includes("icc world cup")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "ICC Cricket World Cup (ODI)":
- Champions & Finalists:
  1975: West Indies beat Australia (Clive Lloyd 102 at Lord's)
  1979: West Indies beat England (Viv Richards 138* at Lord's)
  1983: India beat West Indies (Kapil Dev captain, defended 183 at Lord's)
  1987: Australia beat England in Kolkata (Allan Border captain, Mike Gatting reverse sweep)
  1992: Pakistan beat England in Melbourne (Imran Khan 'cornered tigers', Wasim Akram 3 wkts)
  1996: Sri Lanka beat Australia in Lahore (Arjuna Ranatunga captain, Aravinda de Silva 107*)
  1999: Australia beat Pakistan at Lord's (Shane Warne 4/33, Australia won by 8 wickets)
  2003: Australia beat India in Johannesburg (Ricky Ponting 140* off 121 balls)
  2007: Australia beat Sri Lanka in Barbados (Adam Gilchrist 149 with squash ball in glove)
  2011: India beat Sri Lanka in Mumbai (MS Dhoni 91* finishing with a six, Gambhir 97)
  2015: Australia beat New Zealand in Melbourne (Michael Clarke captain, Starc Player of Tournament)
  2019: England beat New Zealand at Lord's (tied match & tied Super Over, boundary countback rule)
  2023: Australia beat India in Ahmedabad (Travis Head 137, Australia 6th title)`;
  }

  if (t.includes("ashes")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "The Ashes Series":
- Iconic series: 1981 Botham's Ashes (Ian Botham 149* at Headingley after follow-on, Bob Willis 8/43). 1993 Shane Warne "Ball of the Century" to Mike Gatting at Old Trafford. 2005 England win 2-1 (Edgbaston 2-run win, Flintoff & Pietersen). 2006-07 Australia 5-0 whitewash (Warne & McGrath farewell). 2010-11 England win 3-1 in Australia (Alastair Cook 766 runs). 2013-14 Australia 5-0 (Mitchell Johnson 37 wickets). 2019 drawn 2-2 (Ben Stokes 135* at Headingley with Leach 1*, Steve Smith 774 runs). 2023 drawn 2-2 (Stuart Broad final wicket on retirement).`;
  }

  if (t.includes("nba finals") || t.includes("playoffs") || t.includes("nba")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "NBA Finals & Playoffs":
- Champions & MVPs:
  1991-1993: Chicago Bulls three-peat (Michael Jordan 3 Finals MVPs)
  1994-1995: Houston Rockets back-to-back (Hakeem Olajuwon Finals MVP)
  1996-1998: Chicago Bulls second three-peat (Michael Jordan 3 Finals MVPs, 1998 'Last Shot' vs Jazz)
  1999: San Antonio Spurs (Tim Duncan Finals MVP)
  2000-2002: Los Angeles Lakers three-peat (Shaquille O'Neal 3 Finals MVPs)
  2003, 2005, 2007, 2014: San Antonio Spurs (Duncan, Parker, Kawhi)
  2004: Detroit Pistons upset Lakers 4-1 (Chauncey Billups Finals MVP)
  2006: Miami Heat beat Mavericks 4-2 (Dwyane Wade Finals MVP from 0-2 down)
  2008: Boston Celtics beat Lakers 4-2 (Paul Pierce Finals MVP, Kevin Garnett, Ray Allen)
  2009-2010: Los Angeles Lakers back-to-back (Kobe Bryant 2 Finals MVPs)
  2011: Dallas Mavericks beat Heat Big 3 (Dirk Nowitzki Finals MVP)
  2012-2013: Miami Heat back-to-back (LeBron James 2 Finals MVPs, Ray Allen Game 6 2013 shot)
  2015, 2017, 2018, 2022: Golden State Warriors (Iguodala, KD x2, Curry 2022 Finals MVP)
  2016: Cleveland Cavaliers beat 73-9 Warriors (LeBron James Finals MVP, historic 3-1 comeback, Kyrie shot)
  2019: Toronto Raptors beat Warriors (Kawhi Leonard Finals MVP)
  2020: Los Angeles Lakers in Orlando Bubble (LeBron James Finals MVP)
  2021: Milwaukee Bucks beat Suns (Giannis Antetokounmpo 50-pt Game 6, Finals MVP)
  2023: Denver Nuggets beat Heat (Nikola Jokic Finals MVP)
  2024: Boston Celtics beat Mavericks 4-1 (Jaylen Brown Finals MVP)`;
  }

  if (t.includes("monaco") || t.includes("grand prix") || t.includes("drivers' championship") || t.includes("formula 1") || t.includes("f1")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Formula 1":
- Drivers' Championships & Records:
  Most World Championships: Michael Schumacher (7: 1994, 1995, 2000-2004) & Lewis Hamilton (7: 2008, 2014, 2015, 2017-2020).
  Sebastian Vettel (4: 2010-2013 with Red Bull).
  Max Verstappen (2021 Abu Dhabi last lap pass, 2022, 2023 with 19 wins record, 2024).
  Ayrton Senna (3: 1988, 1990, 1991 with McLaren). Alain Prost (4: 1985, 1986, 1989, 1993).
  Fernando Alonso (2: 2005, 2006 with Renault). Kimi Raikkonen (2007 with Ferrari). Jenson Button (2009 with Brawn GP). Nico Rosberg (2016 with Mercedes).
- Monaco Grand Prix: Ayrton Senna record 6 wins. Graham Hill & Michael Schumacher 5 wins. Lewis Hamilton 3 wins. Charles Leclerc won from pole in 2024 (first Monegasque winner since 1931).
- Monza (Italian GP): Sebastian Vettel maiden win in wet 2008 for Toro Rosso. Pierre Gasly 2020 win for AlphaTauri. Daniel Ricciardo 2021 win for McLaren.`;
  }

  if (t.includes("wrestlemania")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "WrestleMania":
- Milestones & Matches:
  WM 1 (1985): Hulk Hogan & Mr. T beat Roddy Piper & Paul Orndorff
  WM 3 (1987): Hulk Hogan body-slammed Andre the Giant at Pontiac Silverdome; Randy Savage vs Ricky Steamboat
  WM 10 (1994): Razor Ramon vs Shawn Michaels Ladder Match for IC title; Bret Hart won WWF title
  WM 12 (1996): Shawn Michaels beat Bret Hart in 60-Minute Iron Man match in sudden death
  WM 13 (1997): Bret Hart vs Steve Austin submission match (Austin passed out in blood)
  WM 14 (1998): Stone Cold Steve Austin beat Shawn Michaels with Mike Tyson as special enforcer
  WM 17 / X-Seven (2001): Austin beat Rock with Vince McMahon assistance in Houston; TLC II match
  WM 18 (2002): The Rock beat Hollywood Hulk Hogan ("Icon vs Icon" in Toronto Skydome)
  WM 19 (2003): The Rock beat Stone Cold Steve Austin (Austin's final match for 19 years); Brock Lesnar beat Kurt Angle
  WM 20 (2004): Chris Benoit won World Heavyweight Title triple threat; Eddie Guerrero retained vs Kurt Angle
  WM 21 (2005): John Cena beat JBL & Batista beat Triple H to win their maiden world titles; Edge won first Money in the Bank
  WM 24 (2008): Shawn Michaels retired Ric Flair ("I'm sorry, I love you")
  WM 25 (2009) & WM 26 (2010): The Undertaker vs Shawn Michaels (WM 26 was Career vs Streak, retiring Michaels)
  WM 30 (2014): Daniel Bryan won WWE World Heavyweight Title; Brock Lesnar ended The Undertaker's 21-0 Streak
  WM 31 (2015): Seth Rollins cashed in Money in the Bank during Lesnar vs Reigns ("Heist of the Century")
  WM 35 (2019): Becky Lynch won first-ever women's main event vs Ronda Rousey & Charlotte Flair
  WM 40 / XL (2024): Cody Rhodes defeated Roman Reigns in Bloodline Rules match with appearances by Undertaker, The Rock, and John Cena`;
  }

  if (t.includes("royal rumble")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Royal Rumble":
- All-time records:
  Most victories: Stone Cold Steve Austin (3 wins: 1997, 1998, 2001).
  Two-time winners: Hulk Hogan (1990, 1991), Shawn Michaels (1995 from #1, 1996), Triple H (2002, 2016), Batista (2005, 2014), John Cena (2008 from #30, 2013), Randy Orton (2009, 2017), Edge (2010, 2021 from #1), Brock Lesnar (2003, 2022), Cody Rhodes (2023 from #30, 2024).
  Inaugural winner: 'Hacksaw' Jim Duggan in 1988.
  Fastest elimination: Santino Marella (1.9 seconds by Kane in 2009).
  Most eliminations in single Rumble: Brock Lesnar (13 in 2020) & Braun Strowman (13 in Greatest Royal Rumble).`;
  }

  if (t.includes("ufc numbered") || t.includes("championship fights") || t.includes("ufc")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "UFC":
- Key PPVs & Historical Fights:
  UFC 1 (1993): Royce Gracie submitted 3 opponents in Denver to win tournament.
  UFC 100 (2009): Brock Lesnar TKO Frank Mir 2; GSP beat Thiago Alves; Dan Henderson KO Michael Bisping.
  UFC 128 (2011): Jon Jones beat Shogun Rua to become youngest UFC champion at age 23.
  UFC 189 (2015): Robbie Lawler TKO Rory MacDonald in legendary 5-round battle; McGregor TKO Chad Mendes.
  UFC 193 (2015): Holly Holm head-kick KO of undefeated Ronda Rousey in Melbourne.
  UFC 194 (2015): Conor McGregor KO Jose Aldo in 13 seconds (fastest title fight KO in UFC history).
  UFC 196 (2016): Nate Diaz submitted Conor McGregor via rear-naked choke in round 2.
  UFC 205 (2016): Conor McGregor TKO Eddie Alvarez at MSG to become first simultaneous two-division champion.
  UFC 217 (2017): Georges St-Pierre returned after 4 years to choke out Michael Bisping for Middleweight title.
  UFC 229 (2018): Khabib Nurmagomedov submitted Conor McGregor in round 4 (highest PPV buyrate in UFC history: 2.4 million buys).
  UFC 239 (2019): Jorge Masvidal 5-second flying knee KO of Ben Askren (fastest KO in UFC history).
  UFC 287 (2023): Israel Adesanya KO Alex Pereira in round 2 to reclaim Middleweight title.
  UFC 300 (2024): Alex Pereira KO Jamahal Hill in round 1; Max Holloway KO Justin Gaethje at 4:59 of round 5 for BMF title.
- Undefeated Legend: Khabib Nurmagomedov retired 29-0 (defended title against McGregor, Poirier, Gaethje).
- Title Defense Record: Demetrious Johnson (11 consecutive flyweight defenses), Anderson Silva (10 middleweight defenses, 16-fight win streak).`;
  }

  return "";
}

/**
 * Builds the AI system prompt enforcing sports factuality, credible options, strict JSON format,
 * zero repetition, and strict temporal boundary (1975-2026 only).
 */
function buildPrompt(options: GenerateOptions): string {
  const { sport, difficulty, count, category, excludeStems, excludeAnswers } = options;

  let sportInstruction = "";
  if (sport === "All Sports") {
    sportInstruction = `Distribute the ${count} questions across a balanced variety of these 6 sports ONLY:
1. Cricket (ICC World Cups, IPL, Ashes, T20)
2. Football (strictly Association Football / FIFA Soccer - Champions League, Premier League, World Cup)
3. Basketball (NBA Finals, MVP, Olympic Hoops)
4. Formula 1 (Grand Prix winners, World Drivers' Championship)
5. WWE/WWF (WrestleMania, Royal Rumble, Attitude Era, WWE Champions)
6. UFC (Ultimate Fighting Championship, Octagon title fights, MMA legends)

STRICT NEGATIVE CONSTRAINT: Under NO circumstances generate questions about American Football / NFL / Super Bowl. Under NO circumstances generate sports outside these 6.`;
  } else if (sport === "Football") {
    sportInstruction = `All ${count} questions MUST be strictly and exclusively about ASSOCIATION FOOTBALL / FIFA SOCCER (e.g. FIFA World Cup, UEFA Champions League, Premier League, La Liga, Serie A, Ballon d'Or, Copa América, Euro Championships, and legends like Lionel Messi, Cristiano Ronaldo, Pelé, Diego Maradona, Kylian Mbappé, Zinedine Zidane, Erling Haaland, Johan Cruyff, Pep Guardiola).
STRICT NEGATIVE CONSTRAINT: Absolutely DO NOT generate questions about American football, NFL, Super Bowl, quarterbacks, touchdowns, or gridiron. Any NFL trivia is invalid and rejected.`;
  } else if (sport === "WWE/WWF") {
    sportInstruction = `All ${count} questions MUST be strictly and exclusively about WWE / WWF Professional Wrestling (e.g. WrestleMania, Royal Rumble, SummerSlam, Survivor Series, Attitude Era, Ruthless Aggression, modern WWE, and iconic superstars such as Stone Cold Steve Austin, The Rock, The Undertaker, John Cena, Roman Reigns, Shawn Michaels, Triple H, Bret Hart, Hulk Hogan (1980s+), Randy Orton, Brock Lesnar, Cody Rhodes, Seth Rollins, Royal Rumble records, and championship reigns).`;
  } else if (sport === "UFC") {
    sportInstruction = `All ${count} questions MUST be strictly and exclusively about UFC (Ultimate Fighting Championship) and MMA (e.g. UFC Numbered Pay-Per-Views, Octagon title fights, Hall of Fame legends like Jon Jones, Khabib Nurmagomedov, Conor McGregor, Georges St-Pierre, Anderson Silva, Amanda Nunes, Israel Adesanya, Alex Pereira, Daniel Cormier, Chuck Liddell, Kamaru Usman, fastest knockouts, submission records, and championship bouts).`;
  } else if (sport === "Formula 1") {
    sportInstruction = `All ${count} questions MUST be strictly and exclusively about FORMULA 1 (FIA Formula One World Championship, Grand Prix race winners, World Drivers' and Constructors' Champions, circuits like Monaco, Silverstone, Monza, Spa, and drivers like Lewis Hamilton, Michael Schumacher, Max Verstappen, Ayrton Senna, Alain Prost, Sebastian Vettel, Fernando Alonso, Kimi Räikkönen).`;
  } else if (sport === "Cricket") {
    sportInstruction = `All ${count} questions MUST be strictly and exclusively about CRICKET (ICC Men's & Women's Cricket World Cup, ICC T20 World Cup, Indian Premier League / IPL, The Ashes, Test cricket records, and legends like Sachin Tendulkar, Virat Kohli, MS Dhoni, Ricky Ponting, Shane Warne, Brian Lara, Wasim Akram, Rohit Sharma, Jasprit Bumrah, Ben Stokes).`;
  } else if (sport === "Basketball") {
    sportInstruction = `All ${count} questions MUST be strictly and exclusively about BASKETBALL (NBA Finals, NBA Playoffs, Regular Season MVPs, All-Stars, Olympic Men's Basketball, and legends like Michael Jordan, LeBron James, Kobe Bryant, Stephen Curry, Shaquille O'Neal, Magic Johnson, Larry Bird, Nikola Jokić, Giannis Antetokounmpo).`;
  }

  let diffInstruction = "";
  if (difficulty === "Easy") {
    diffInstruction = `DIFFICULTY: EASY (Mainstream Knowledge)
- Target: Casual fans. Test famous champions, iconic record holders, legendary milestones (e.g., Messi 2022 World Cup, Undertaker WrestleMania streak, Hamilton 7 titles, Jordan Bulls 6 rings, IPL inaugural champion).
- DO NOT ask obscure bench players or minor technical stats.`;
  } else if (difficulty === "Medium") {
    diffInstruction = `DIFFICULTY: MEDIUM (Active Sports Follower)
- Target: Active followers. Test tournament runners-up, MVP/Golden Boot winners, championship scorelines, historic transfers, and notable rivalries.`;
  } else if (difficulty === "Hard") {
    diffInstruction = `DIFFICULTY: HARD (Dedicated Sports Enthusiast)
- Target: Die-hard fans. Test specific tournament editions, exact final scores, host venues, decisive extra-time/shootout moments, and tactical head-to-heads.`;
  } else if (difficulty === "Legendary") {
    diffInstruction = `DIFFICULTY: LEGENDARY (Trivia Archivists & Historians)
- Target: Deep-cut trivia masters. Test rare statistical anomalies, specific player substitutions in historic finals, venue trivia, debut opponents, or obscure regulations.
- STRICTLY FORBIDDEN to ask common-knowledge or trivial questions.`;
  } else {
    diffInstruction = `DIFFICULTY: MIXED
- Provide a balanced mix across Easy, Medium, and Hard difficulty levels. Label each question's difficulty accurately.`;
  }

  const tournamentGrounding = getTournamentContext(category);
  const categoryInstruction = category && category !== "All" && category !== "All Tournaments" && category !== "All Events" && category !== "All Grand Prix"
    ? `STRICT TOURNAMENT/LEAGUE ACCURACY FOCUS:
Every question MUST strictly and exclusively focus on: "${category}".
All questions, correct answers, and plausible distractors MUST directly reference real, verified matches, champions, moments, or records from "${category}".
Set the "category" property of each question to "${category}".

${tournamentGrounding}

CRITICAL VERIFICATION RULES FOR "${category}":
1. ABSOLUTE HISTORICAL ACCURACY: Only use undeniable, historically recorded facts from official tournament record books. Never guess or hallucinate.
2. ALWAYS SPECIFY THE EXACT YEAR: Mention the exact year of the match, edition, or record in the question text (e.g., "In the 2016 IPL final...", "At the 2005 Champions League final in Istanbul...").
3. NEVER CONFUSE RUNNERS-UP WITH CHAMPIONS: Verify that the correct answer is the TRUE, historically documented winner.
4. CREDIBLE DISTRACTORS: The 3 incorrect options must be real participants from that exact tournament/league and era, but NOT the winner/record holder for that specific question.
5. EXPLANATION: Clearly cite the year, opponent/finalist, scoreline, or record in the explanation.`
    : "";

  const excludeSection =
    (excludeStems && excludeStems.length > 0) || (excludeAnswers && excludeAnswers.length > 0)
      ? `\nNON-REPETITION CONSTRAINT:
Do NOT generate questions similar to these recent topics or with these answers:
- Stems to avoid: ${excludeStems?.slice(0, 40).join("; ") || "None"}
- Answers to avoid: ${excludeAnswers?.slice(0, 40).join("; ") || "None"}`
      : "";

  const randomSeed = `Entropy Seed: ${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  return `You are the world's leading sports trivia archivist and competition historian.
Generate exactly ${count} unique, factually verified sports trivia questions adhering strictly to these specifications:

SPECIFICATIONS:
- Target Sport: ${sport}
- Target Difficulty: ${difficulty}
${sportInstruction}

${diffInstruction}

${categoryInstruction}
${excludeSection}
${randomSeed}

STRICT TEMPORAL RULES (CRITICAL):
1. ALL TRIVIA MUST BE BETWEEN 1975 AND 2026:
   - Every question MUST refer to matches, champions, records, fights, or events that occurred between 1975 and 2026.
   - ABSOLUTELY NO questions from before 1975 (no 1930s, 1950s, 1960s, or early 1970s). Any pre-1975 question will be strictly rejected.
   - ACTIVELY INCLUDE modern events from the 2020s (2020, 2021, 2022, 2023, 2024, 2025, 2026).
   - The "year" field must be an integer between 1975 and 2026.

QUALITY & VERIFICATION RULES:
2. FACTUAL ACCURACY: Never hallucinate or guess scores, winners, or stats. Use only 100% verified historical facts.
3. 4 PLAUSIBLE OPTIONS: Exactly 4 options per question. All 4 must be plausible peers of the exact same category and era.
4. UNBIASED POSITION: The correct answer must be naturally distributed among options (do NOT place answer at option 0 / A every time).
5. CONCISE EXPLANATION: 1-2 sentence explanation citing the year, tournament, and key context.
6. NO DUPLICATES: Every question in this batch must be distinct.

OUTPUT FORMAT:
Respond ONLY with a valid JSON array of objects. Do not include markdown wraps (like \`\`\`json) or extra text.
Each object must have these exact keys:
[
  {
    "sport": "${sport === "All Sports" ? "Cricket" : sport}",
    "difficulty": "Medium",
    "category": "${category || "Sports Records"}",
    "year": 2022,
    "question": "Which player won the Player of the Tournament award in the 2022 ICC Men's T20 World Cup?",
    "options": ["Sam Curran", "Virat Kohli", "Jos Buttler", "Shaheen Afridi"],
    "answer": "Sam Curran",
    "explanation": "Sam Curran took 13 wickets in the tournament and was named Player of the Tournament as England won the title."
  }
]`;
}

/**
 * Clean and parse raw JSON text from AI response
 */
function parseAIJsonResponse(rawText: string): RawGeneratedQuestion[] {
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  cleaned = cleaned.trim();

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonSlice = cleaned.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(jsonSlice);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as RawGeneratedQuestion[];
      }
    } catch {
      // Continue to object parse
    }
  }

  // Check object with array value (e.g. {"questions": [...]})
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSlice = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonSlice);
      const possibleArray = Object.values(parsed).find((v) => Array.isArray(v));
      if (Array.isArray(possibleArray) && possibleArray.length > 0) {
        return possibleArray as RawGeneratedQuestion[];
      }
    } catch {
      // Fall through
    }
  }

  throw new Error("AI response was not a valid JSON question array.");
}

/**
 * Generate questions via Google Gemini REST API (Primary for Classic & Challenge modes)
 */
async function generateViaGemini(options: GenerateOptions, apiKey: string, model: string): Promise<RawGeneratedQuestion[]> {
  const prompt = buildPrompt(options);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty content.");
  }

  return parseAIJsonResponse(text);
}

/**
 * Internal single-batch caller for OpenAI-compatible REST APIs
 */
async function generateViaOpenAICompatibleSingle(
  options: GenerateOptions,
  baseUrl: string,
  apiKey: string,
  preferredModel: string
): Promise<RawGeneratedQuestion[]> {
  const candidateModels = [
    preferredModel,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "qwen/qwen3.8-27b",
    "llama-3.1-8b-instant",
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const prompt = buildPrompt(options);
      const isReasoningModel = model.includes("gpt-oss") || model.includes("o1") || model.includes("o3");
      const payload: Record<string, any> = {
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert sports trivia engine and competition archivist. You output ONLY valid JSON arrays containing sports trivia question objects. Never include markdown code fences or conversational text.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: Math.min(Math.max(options.count * 200, 800), 2200),
      };

      if (isReasoningModel) {
        payload.reasoning_effort = "low";
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (
          response.status === 404 ||
          response.status === 400 ||
          response.status === 429 ||
          errorText.includes("model_not_found") ||
          errorText.includes("OTPM")
        ) {
          // Model unavailable or rate-limited; gracefully advance to candidate model
          continue;
        }
        throw new Error(`AI API error (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      const choice0 = data?.choices?.[0]?.message;
      const content = choice0?.content;
      if (!content) {
        continue;
      }

      return parseAIJsonResponse(content);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Failed to generate questions via AI provider");
}

/**
 * Generate questions via Groq / xAI / OpenAI-compatible REST API (Primary for 1v1 & 60s Blitz modes).
 * Supports parallel chunking for counts > 8 to guarantee fast, non-truncated generation.
 */
async function generateViaOpenAICompatible(
  options: GenerateOptions,
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<RawGeneratedQuestion[]> {
  if (options.count > 8) {
    const chunks: number[] = [];
    let remaining = options.count;
    while (remaining > 0) {
      const take = Math.min(remaining, 8);
      chunks.push(take);
      remaining -= take;
    }

    try {
      const results = await Promise.all(
        chunks.map((batchCount) =>
          generateViaOpenAICompatibleSingle({ ...options, count: batchCount }, baseUrl, apiKey, model)
        )
      );
      const combined: RawGeneratedQuestion[] = [];
      const seen = new Set<string>();
      for (const batch of results) {
        for (const q of batch) {
          const norm = q.question.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (!seen.has(norm)) {
            seen.add(norm);
            combined.push(q);
          }
        }
      }
      if (combined.length >= Math.floor(options.count * 0.7)) {
        return combined;
      }
    } catch {
      // Fall through to single batch
    }
  }

  return generateViaOpenAICompatibleSingle(options, baseUrl, apiKey, model);
}

/**
 * High-quality curated sports trivia fallback engine for the 6 core sports.
 * Strictly 1975-2026. Guarantees zero failures and accurate facts.
 */
function generateFallbackQuestions(options: GenerateOptions): RawGeneratedQuestion[] {
  const sports = options.sport === "All Sports" ? [...SPORT_LIST] : [options.sport];
  const targetDiff = options.difficulty;
  const count = options.count;

  // Curated sports trivia facts matrix strictly between 1975 and 2026 for all 6 sports
  const factsBank: Record<Sport, Array<{ q: string; opts: [string, string, string, string]; a: string; exp: string; diff: Difficulty; yr: number }>> = {
    Cricket: [
      { q: "Who scored the fastest century in Men's ODI cricket history (off just 31 balls)?", opts: ["AB de Villiers", "Corey Anderson", "Shahid Afridi", "Chris Gayle"], a: "AB de Villiers", exp: "AB de Villiers struck a 31-ball hundred against West Indies in Johannesburg in 2015.", diff: "Easy", yr: 2015 },
      { q: "Which team won the inaugural Indian Premier League (IPL) title in 2008 under Shane Warne?", opts: ["Rajasthan Royals", "Chennai Super Kings", "Delhi Daredevils", "Kings XI Punjab"], a: "Rajasthan Royals", exp: "Rajasthan Royals defeated CSK by 3 wickets in the 2008 final at DY Patil Stadium.", diff: "Easy", yr: 2008 },
      { q: "Who captained India to their historic victory in the inaugural 2007 ICC World Twenty20?", opts: ["MS Dhoni", "Rahul Dravid", "Sourav Ganguly", "Yuvraj Singh"], a: "MS Dhoni", exp: "MS Dhoni led India to defeat Pakistan in the Johannesburg final in 2007.", diff: "Easy", yr: 2007 },
      { q: "Who holds the record for the highest individual score in Test match cricket with 400 not out?", opts: ["Brian Lara", "Matthew Hayden", "Don Bradman", "Virender Sehwag"], a: "Brian Lara", exp: "Brian Lara scored 400* against England in Antigua in 2004.", diff: "Easy", yr: 2004 },
      { q: "Who holds the record for the most runs in a single IPL season with 973 runs in 2016?", opts: ["Virat Kohli", "David Warner", "Jos Buttler", "Shubman Gill"], a: "Virat Kohli", exp: "Virat Kohli scored 973 runs including 4 centuries for RCB in IPL 2016.", diff: "Easy", yr: 2016 },
      { q: "Which team won the 2019 ICC Men's Cricket World Cup final at Lord's on boundary countback?", opts: ["England", "New Zealand", "Australia", "India"], a: "England", exp: "England won following a tied match and tied Super Over against New Zealand.", diff: "Medium", yr: 2019 },
      { q: "Which franchise won their maiden IPL championship in their debut season in 2022 under Hardik Pandya?", opts: ["Gujarat Titans", "Lucknow Super Giants", "Rajasthan Royals", "Royal Challengers Bangalore"], a: "Gujarat Titans", exp: "Gujarat Titans defeated Rajasthan Royals by 7 wickets in the 2022 final in Ahmedabad.", diff: "Medium", yr: 2022 },
      { q: "Which nation won the 2024 ICC Men's T20 World Cup by defeating South Africa in the final?", opts: ["India", "South Africa", "England", "Australia"], a: "India", exp: "India won by 7 runs in Barbados with Virat Kohli scoring 76 and Jasprit Bumrah taking 2/18.", diff: "Medium", yr: 2024 },
      { q: "Which nation won the inaugural ICC Men's Cricket World Cup held in England in 1975?", opts: ["West Indies", "Australia", "England", "Pakistan"], a: "West Indies", exp: "Clive Lloyd led the West Indies to victory over Australia in the 1975 final at Lord's.", diff: "Medium", yr: 1975 },
      { q: "Who was the Man of the Match in the 1999 ICC Men's Cricket World Cup Final at Lord's?", opts: ["Shane Warne", "Glenn McGrath", "Adam Gilchrist", "Steve Waugh"], a: "Shane Warne", exp: "Shane Warne took 4 for 33 as Australia bowled Pakistan out for 132 in 1999.", diff: "Hard", yr: 1999 },
      { q: "Who hit 4 consecutive sixes off Ben Stokes in the final over of the 2016 ICC Men's T20 World Cup Final?", opts: ["Carlos Brathwaite", "Marlon Samuels", "Chris Gayle", "Andre Russell"], a: "Carlos Brathwaite", exp: "Carlos Brathwaite powered West Indies to victory with 4 consecutive sixes at Eden Gardens.", diff: "Hard", yr: 2016 },
      { q: "Who was the only bowler to take 4 wickets in 4 consecutive balls in a Men's Cricket World Cup match?", opts: ["Lasith Malinga", "Wasim Akram", "Chaminda Vaas", "Brett Lee"], a: "Lasith Malinga", exp: "Lasith Malinga took 4 in 4 against South Africa in the 2007 World Cup in Guyana.", diff: "Legendary", yr: 2007 },
      { q: "Against which team and at which venue did Sachin Tendulkar score his 100th international century in 2012?", opts: ["Bangladesh at Mirpur", "Sri Lanka at Colombo", "England at The Oval", "Australia at Sydney"], a: "Bangladesh at Mirpur", exp: "Tendulkar achieved his historic 100th international century in 2012 against Bangladesh at Sher-e-Bangla Stadium.", diff: "Legendary", yr: 2012 },
    ],
    Football: [
      { q: "Which national team won the 2022 FIFA World Cup in Qatar?", opts: ["Argentina", "France", "Croatia", "Morocco"], a: "Argentina", exp: "Argentina defeated France 4-2 on penalties following an epic 3-3 draw.", diff: "Easy", yr: 2022 },
      { q: "Which club won the 2023 UEFA Champions League final against Inter Milan to complete a European treble?", opts: ["Manchester City", "Inter Milan", "Real Madrid", "Bayern Munich"], a: "Manchester City", exp: "Manchester City defeated Inter 1-0 in Istanbul with a goal from Rodri.", diff: "Easy", yr: 2023 },
      { q: "Who is the all-time leading goalscorer in UEFA Champions League history?", opts: ["Cristiano Ronaldo", "Lionel Messi", "Robert Lewandowski", "Karim Benzema"], a: "Cristiano Ronaldo", exp: "Cristiano Ronaldo has scored 140 goals in the UEFA Champions League.", diff: "Easy", yr: 2023 },
      { q: "Which club completed an entire 38-game Premier League season undefeated in 2003-04?", opts: ["Arsenal", "Manchester United", "Chelsea", "Liverpool"], a: "Arsenal", exp: "Arsène Wenger's Arsenal 'Invincibles' went unbeaten throughout the 2003-04 league campaign.", diff: "Easy", yr: 2004 },
      { q: "Who broke the Premier League single-season scoring record with 36 goals in 2022-23?", opts: ["Erling Haaland", "Harry Kane", "Mohamed Salah", "Alan Shearer"], a: "Erling Haaland", exp: "Erling Haaland scored 36 Premier League goals in his debut season for Manchester City.", diff: "Easy", yr: 2023 },
      { q: "Which country won the UEFA Euro 2004 tournament in one of the biggest upsets in football history?", opts: ["Greece", "Portugal", "Czech Republic", "Netherlands"], a: "Greece", exp: "Greece defeated tournament hosts Portugal 1-0 in Lisbon to win Euro 2004.", diff: "Medium", yr: 2004 },
      { q: "Which club overcame a 3-0 halftime deficit to win the 2005 Champions League final in Istanbul?", opts: ["Liverpool", "AC Milan", "Juventus", "Chelsea"], a: "Liverpool", exp: "Steven Gerrard inspired Liverpool's 3-3 comeback before winning 3-2 on penalties.", diff: "Medium", yr: 2005 },
      { q: "Which manager led Leicester City to a fairytale 5000-1 Premier League title in 2015-16?", opts: ["Claudio Ranieri", "Nigel Pearson", "Craig Shakespeare", "Brendan Rodgers"], a: "Claudio Ranieri", exp: "Claudio Ranieri guided Leicester to the title with 81 points.", diff: "Medium", yr: 2016 },
      { q: "Who won the Ballon d'Or in 2018, snapping a 10-year duopoly by Messi and Ronaldo?", opts: ["Luka Modrić", "Antoine Griezmann", "Kylian Mbappé", "Mohamed Salah"], a: "Luka Modrić", exp: "Luka Modrić won after winning the Champions League and leading Croatia to the World Cup final.", diff: "Medium", yr: 2018 },
      { q: "Who scored the 92:48 stoppage-time header for Real Madrid in the 2014 Champions League final against Atlético Madrid?", opts: ["Sergio Ramos", "Cristiano Ronaldo", "Gareth Bale", "Ángel Di María"], a: "Sergio Ramos", exp: "Sergio Ramos forced extra time where Real Madrid went on to win 4-1 for 'La Décima'.", diff: "Hard", yr: 2014 },
      { q: "Which referee officiated the 2010 FIFA World Cup Final between Spain and the Netherlands, issuing 14 yellow cards?", opts: ["Howard Webb", "Pierluigi Collina", "Nicola Rizzoli", "Mark Clattenburg"], a: "Howard Webb", exp: "English referee Howard Webb officiated the fiery 2010 final in Johannesburg.", diff: "Hard", yr: 2010 },
      { q: "Who scored the winning golden goal for France in the 103rd minute of the UEFA Euro 2000 final against Italy?", opts: ["David Trezeguet", "Sylvain Wiltord", "Zinedine Zidane", "Thierry Henry"], a: "David Trezeguet", exp: "David Trezeguet struck the volley in extra time in Rotterdam.", diff: "Hard", yr: 2000 },
      { q: "Who is the only player to score hat-tricks in the Premier League, Champions League, and FA Cup in the 2009-10 season?", opts: ["Yossi Benayoun", "Fernando Torres", "Didier Drogba", "Wayne Rooney"], a: "Yossi Benayoun", exp: "Yossi Benayoun achieved this rare treble of hat-tricks for Liverpool in 2009-10.", diff: "Legendary", yr: 2010 },
    ],
    Basketball: [
      { q: "Who became the NBA's all-time leading regular season scorer in February 2023, surpassing Kareem Abdul-Jabbar?", opts: ["LeBron James", "Michael Jordan", "Kobe Bryant", "Karl Malone"], a: "LeBron James", exp: "LeBron James passed Kareem's 38,387 career points in February 2023.", diff: "Easy", yr: 2023 },
      { q: "Which NBA franchise won 73 regular-season games in 2015-16, setting the all-time single-season record?", opts: ["Golden State Warriors", "Chicago Bulls", "San Antonio Spurs", "Miami Heat"], a: "Golden State Warriors", exp: "The Golden State Warriors finished the 2015-16 regular season with a 73-9 record.", diff: "Easy", yr: 2016 },
      { q: "Which team came back from a 3-1 deficit to win the 2016 NBA Finals?", opts: ["Cleveland Cavaliers", "Golden State Warriors", "Oklahoma City Thunder", "Toronto Raptors"], a: "Cleveland Cavaliers", exp: "LeBron James and the Cavaliers defeated the 73-9 Warriors in Game 7.", diff: "Easy", yr: 2016 },
      { q: "Which team won the 2024 NBA Championship by defeating the Dallas Mavericks 4-1?", opts: ["Boston Celtics", "Dallas Mavericks", "Denver Nuggets", "Minnesota Timberwolves"], a: "Boston Celtics", exp: "Jaylen Brown was named Finals MVP as the Celtics won their record 18th NBA title.", diff: "Easy", yr: 2024 },
      { q: "Which country defeated Team USA in the semi-finals of men's basketball at the 2004 Athens Olympics?", opts: ["Argentina", "Lithuania", "Spain", "Italy"], a: "Argentina", exp: "Manu Ginobili led Argentina to an 89-81 victory on their way to Olympic Gold.", diff: "Medium", yr: 2004 },
      { q: "Who won the 2021 NBA Finals MVP after scoring 50 points in Game 6 for the Milwaukee Bucks?", opts: ["Giannis Antetokounmpo", "Khris Middleton", "Jrue Holiday", "Devin Booker"], a: "Giannis Antetokounmpo", exp: "Giannis Antetokounmpo recorded 50 points, 14 rebounds, and 5 blocks in Game 6.", diff: "Medium", yr: 2021 },
      { q: "Which player scored 8 points in 9 seconds to lead the Indiana Pacers to a shock playoff win over the Knicks in 1995?", opts: ["Reggie Miller", "Rik Smits", "Mark Jackson", "Dale Davis"], a: "Reggie Miller", exp: "Reggie Miller hit two 3-pointers and two free throws in 8.9 seconds at Madison Square Garden.", diff: "Hard", yr: 1995 },
      { q: "Which player won the 2023 NBA Finals MVP after leading Denver to their first title in franchise history?", opts: ["Nikola Jokić", "Jamal Murray", "Aaron Gordon", "Jimmy Butler"], a: "Nikola Jokić", exp: "Nikola Jokić averaged 30.2 points, 14.0 rebounds, and 7.2 assists in the Finals.", diff: "Hard", yr: 2023 },
      { q: "Which team originally drafted Dirk Nowitzki with the 9th overall pick in 1998 before trading him to Dallas?", opts: ["Milwaukee Bucks", "Boston Celtics", "Denver Nuggets", "Golden State Warriors"], a: "Milwaukee Bucks", exp: "The Bucks drafted Dirk Nowitzki in 1998 and traded him to Dallas for Robert Traylor.", diff: "Legendary", yr: 1998 },
      { q: "Who won the NBA Finals MVP in 2004 when the Detroit Pistons upset the Los Angeles Lakers 4-1?", opts: ["Chauncey Billups", "Ben Wallace", "Rip Hamilton", "Rasheed Wallace"], a: "Chauncey Billups", exp: "Chauncey Billups averaged 21 points and 5.2 assists to claim the 2004 Finals MVP.", diff: "Hard", yr: 2004 },
    ],
    "Formula 1": [
      { q: "Which driver holds the record for most race victories in a single Formula 1 season (19 wins in 2023)?", opts: ["Max Verstappen", "Lewis Hamilton", "Michael Schumacher", "Sebastian Vettel"], a: "Max Verstappen", exp: "Max Verstappen won 19 of 22 Grands Prix in a dominant 2023 campaign.", diff: "Easy", yr: 2023 },
      { q: "Who won his first Formula 1 World Championship on the final lap of the 2021 Abu Dhabi Grand Prix?", opts: ["Max Verstappen", "Lewis Hamilton", "Valtteri Bottas", "Lando Norris"], a: "Max Verstappen", exp: "Verstappen overtook Hamilton on lap 58 following a late safety car restart.", diff: "Easy", yr: 2021 },
      { q: "Which driver won the 2024 Monaco Grand Prix from pole position for Scuderia Ferrari?", opts: ["Charles Leclerc", "Oscar Piastri", "Carlos Sainz", "Lando Norris"], a: "Charles Leclerc", exp: "Charles Leclerc became the first Monegasque driver to win his home race since 1931.", diff: "Easy", yr: 2024 },
      { q: "Which team won both the Drivers' and Constructors' Championships in 2009 in their only season of existence?", opts: ["Brawn GP", "Red Bull Racing", "Toyota Racing", "BMW Sauber"], a: "Brawn GP", exp: "Ross Brawn's team won both titles with Jenson Button in 2009 before becoming Mercedes.", diff: "Medium", yr: 2009 },
      { q: "Who holds the record for the most Monaco Grand Prix victories with 6 career wins?", opts: ["Ayrton Senna", "Graham Hill", "Michael Schumacher", "Alain Prost"], a: "Ayrton Senna", exp: "Ayrton Senna won in Monaco in 1987, 1989, 1990, 1991, 1992, and 1993.", diff: "Hard", yr: 1993 },
      { q: "Who won the wet 2008 Italian Grand Prix at Monza for Toro Rosso, becoming the youngest race winner at the time?", opts: ["Sebastian Vettel", "Lewis Hamilton", "Fernando Alonso", "Robert Kubica"], a: "Sebastian Vettel", exp: "21-year-old Sebastian Vettel scored an incredible wet-weather maiden victory.", diff: "Hard", yr: 2008 },
      { q: "Who was the last driver to win the Formula 1 World Drivers' Championship driving for Scuderia Ferrari?", opts: ["Kimi Räikkönen", "Felipe Massa", "Fernando Alonso", "Sebastian Vettel"], a: "Kimi Räikkönen", exp: "Kimi Räikkönen won the 2007 title for Ferrari by a single point over Hamilton and Alonso.", diff: "Legendary", yr: 2007 },
      { q: "At which British circuit did Ayrton Senna produce his iconic wet-weather opening lap overtaking 4 cars in 1993?", opts: ["Donington Park", "Silverstone", "Brands Hatch", "Aintree"], a: "Donington Park", exp: "Senna's legendary 'Lap of the Gods' occurred at the 1993 European Grand Prix at Donington.", diff: "Legendary", yr: 1993 },
    ],
    "WWE/WWF": [
      { q: "Who famously ended The Undertaker's 21-0 WrestleMania undefeated streak at WrestleMania XXX in 2014?", opts: ["Brock Lesnar", "Roman Reigns", "John Cena", "Triple H"], a: "Brock Lesnar", exp: "Brock Lesnar defeated The Undertaker at WrestleMania XXX in New Orleans, shocking the wrestling world.", diff: "Easy", yr: 2014 },
      { q: "Who defeated Roman Reigns in the main event of WrestleMania XL (40) to win the Undisputed WWE Championship?", opts: ["Cody Rhodes", "The Rock", "Seth Rollins", "CM Punk"], a: "Cody Rhodes", exp: "Cody Rhodes finished his story in a Bloodline Rules match at WrestleMania 40 in Philadelphia.", diff: "Easy", yr: 2024 },
      { q: "Which WWE superstar won back-to-back Royal Rumble matches in 1997 and 1998 during the start of the Attitude Era?", opts: ["Stone Cold Steve Austin", "The Rock", "Shawn Michaels", "Mankind"], a: "Stone Cold Steve Austin", exp: "Stone Cold Steve Austin won the Royal Rumble in 1997, 1998, and later 2001 (a record 3 wins).", diff: "Easy", yr: 1998 },
      { q: "Who cashed in Money in the Bank during the main event of WrestleMania 31 in the 'Heist of the Century'?", opts: ["Seth Rollins", "Brock Lesnar", "Roman Reigns", "Dean Ambrose"], a: "Seth Rollins", exp: "Seth Rollins pinned Roman Reigns to win the WWE World Heavyweight Championship.", diff: "Medium", yr: 2015 },
      { q: "Which iconic match featured Mankind being thrown off the top of the Hell in a Cell structure by The Undertaker?", opts: ["King of the Ring 1998", "WrestleMania XIV", "SummerSlam 1998", "Royal Rumble 1999"], a: "King of the Ring 1998", exp: "Mick Foley fell through the announce table at King of the Ring in Pittsburgh in June 1998.", diff: "Medium", yr: 1998 },
      { q: "Who defeated Shawn Michaels in a Career vs Streak match at WrestleMania XXVI in 2010, forcing Michaels into retirement?", opts: ["The Undertaker", "Triple H", "John Cena", "Batista"], a: "The Undertaker", exp: "The Undertaker defeated Shawn Michaels in Arizona to end HBK's in-ring career.", diff: "Medium", yr: 2010 },
      { q: "At which WrestleMania did 'Stone Cold' Steve Austin face The Rock in their historic trilogy finale in 2003?", opts: ["WrestleMania XIX", "WrestleMania X-Seven", "WrestleMania XV", "WrestleMania XX"], a: "WrestleMania XIX", exp: "The Rock defeated Austin at WrestleMania XIX in Seattle in Austin's final match for 19 years.", diff: "Hard", yr: 2003 },
      { q: "Who was the longest-reigning modern WWE Champion of the 21st century, holding the Universal Title for 1,316 days?", opts: ["Roman Reigns", "Brock Lesnar", "CM Punk", "John Cena"], a: "Roman Reigns", exp: "Roman Reigns held the championship from Payback 2020 until WrestleMania XL in April 2024.", diff: "Hard", yr: 2024 },
      { q: "Who won the first-ever Men's Royal Rumble match held in Hamilton, Ontario in January 1988?", opts: ["'Hacksaw' Jim Duggan", "One Man Gang", "Bret Hart", "Don Muraco"], a: "'Hacksaw' Jim Duggan", exp: "Jim Duggan eliminated One Man Gang to win the inaugural 20-man Royal Rumble in 1988.", diff: "Legendary", yr: 1988 },
    ],
    UFC: [
      { q: "Who holds the record for the fastest knockout in UFC history, finishing Ben Askren in just 5 seconds in 2019?", opts: ["Jorge Masvidal", "Conor McGregor", "Duane Ludwig", "Francis Ngannou"], a: "Jorge Masvidal", exp: "Jorge Masvidal landed a flying knee at UFC 239 in July 2019 to score a 5-second knockout.", diff: "Easy", yr: 2019 },
      { q: "Who knocked out Jose Aldo in 13 seconds to win the featherweight title at UFC 194?", opts: ["Conor McGregor", "Max Holloway", "Chad Mendes", "Frankie Edgar"], a: "Conor McGregor", exp: "Conor McGregor landed a counter left hook 13 seconds into the 1st round in Las Vegas.", diff: "Easy", yr: 2015 },
      { q: "Who scored a dramatic knockout at 4:59 of round 5 to win the BMF title at UFC 300?", opts: ["Max Holloway", "Justin Gaethje", "Dustin Poirier", "Charles Oliveira"], a: "Max Holloway", exp: "Max Holloway pointed to the center and knocked out Justin Gaethje with one second remaining.", diff: "Easy", yr: 2024 },
      { q: "Which UFC fighter became the first simultaneous two-division champion by knocking out Eddie Alvarez at UFC 205 in 2016?", opts: ["Conor McGregor", "Daniel Cormier", "Henry Cejudo", "Amanda Nunes"], a: "Conor McGregor", exp: "Conor McGregor captured the Lightweight title at Madison Square Garden to hold both 145 and 155 belts.", diff: "Easy", yr: 2016 },
      { q: "Who became the youngest champion in UFC history at age 23 by defeating Maurício 'Shogun' Rua at UFC 128?", opts: ["Jon Jones", "Georges St-Pierre", "Jose Aldo", "Cain Velasquez"], a: "Jon Jones", exp: "Jon Jones captured the light heavyweight championship in Newark in March 2011.", diff: "Medium", yr: 2011 },
      { q: "How many consecutive successful UFC title defenses did Demetrious Johnson achieve to set the all-time UFC record?", opts: ["11 defenses", "10 defenses", "12 defenses", "9 defenses"], a: "11 defenses", exp: "Demetrious 'Mighty Mouse' Johnson defended the flyweight title 11 consecutive times between 2012 and 2017.", diff: "Medium", yr: 2017 },
      { q: "Who submitted Conor McGregor via neck crank in the 4th round of their record-breaking grudge match at UFC 229?", opts: ["Khabib Nurmagomedov", "Nate Diaz", "Dustin Poirier", "Justin Gaethje"], a: "Khabib Nurmagomedov", exp: "Khabib Nurmagomedov retained his lightweight championship at UFC 229 in October 2018.", diff: "Medium", yr: 2018 },
      { q: "At which event did Holly Holm deliver a head kick knockout to upset undefeated Ronda Rousey in November 2015?", opts: ["UFC 193 in Melbourne", "UFC 190 in Rio", "UFC 194 in Las Vegas", "UFC 200 in Las Vegas"], a: "UFC 193 in Melbourne", exp: "Holly Holm knocked out Ronda Rousey in front of 56,214 fans at Marvel Stadium in Melbourne.", diff: "Hard", yr: 2015 },
      { q: "Who is the only fighter in UFC history to successfully win championship belts in both Middleweight and Light Heavyweight divisions within 7 UFC fights?", opts: ["Alex Pereira", "Israel Adesanya", "Jon Jones", "Dan Henderson"], a: "Alex Pereira", exp: "Alex Pereira won the middleweight title at UFC 281 and light heavyweight title at UFC 295.", diff: "Hard", yr: 2023 },
      { q: "At UFC 1 in November 1993 in Denver, who won the tournament by submitting three opponents in one night?", opts: ["Royce Gracie", "Ken Shamrock", "Gerard Gordeau", "Art Jimmerson"], a: "Royce Gracie", exp: "Brazilian Jiu-Jitsu pioneer Royce Gracie won the inaugural UFC tournament in 1993.", diff: "Legendary", yr: 1993 },
    ],
  };

  const pool: RawGeneratedQuestion[] = [];
  for (const s of sports) {
    const list = factsBank[s] || factsBank["Cricket"];
    for (const item of list) {
      if (targetDiff !== "Mixed" && item.diff !== targetDiff) continue;
      pool.push({
        sport: s,
        difficulty: item.diff,
        category: options.category || `${s} Heritage Records`,
        year: item.yr,
        question: item.q,
        options: [...item.opts],
        answer: item.a,
        explanation: item.exp,
        source: "Arena Sports Verified Archives",
      });
    }
  }

  if (pool.length < count) {
    // If specific difficulty didn't have enough, pull in remaining items for the EXACT SAME sports (never cross-contaminate sports!)
    for (const s of sports) {
      const list = factsBank[s] || factsBank["Cricket"];
      for (const item of list) {
        if (pool.some((p) => p.question === item.q)) continue;
        pool.push({
          sport: s,
          difficulty: item.diff,
          category: options.category || `${s} Heritage Records`,
          year: item.yr,
          question: item.q,
          options: [...item.opts],
          answer: item.a,
          explanation: item.exp,
          source: "Arena Sports Verified Archives",
        });
      }
    }
  }

  // Shuffle and slice requested count
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Main Question Generation Service.
 * Routes automatically based on game mode:
 * - "classic" and "challenge" -> Google Gemini
 * - "multiplayer" (1v1) and "sprint" (60s) -> Grok / Groq API
 */
export async function generateAIQuestions(options: GenerateOptions): Promise<RawGeneratedQuestion[]> {
  const mode = options.mode || "classic";
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

  // 1. 1v1 Multiplayer & 60s Sprint -> Routed to Grok / Groq API
  if (mode === "multiplayer" || mode === "sprint") {
    // Try Groq API first (free high-speed inference)
    if (groqKey) {
      try {
        const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
        return await generateViaOpenAICompatible(options, "https://api.groq.com/openai/v1", groqKey, model);
      } catch (err) {
        console.warn(`[AI Generator - Grok] Groq API warning: ${err instanceof Error ? err.message : String(err)}. Checking fallback.`);
      }
    }

    // Try xAI Grok endpoint if configured
    if (xaiKey && xaiKey !== groqKey) {
      try {
        const model = process.env.XAI_MODEL || "grok-beta";
        return await generateViaOpenAICompatible(options, "https://api.x.ai/v1", xaiKey, model);
      } catch (err) {
        console.warn(`[AI Generator - xAI] xAI Grok error: ${err instanceof Error ? err.message : String(err)}.`);
      }
    }

    // If Grok key is missing or failed, use Gemini as backup before falling back
    if (geminiKey) {
      try {
        const model = process.env.AI_MODEL || "gemini-2.5-flash";
        return await generateViaGemini(options, geminiKey, model);
      } catch (err) {
        console.warn(`[AI Generator - Gemini Backup for ${mode}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 2. Classic & Challenge Modes -> Routed to Google Gemini
  if (mode === "classic" || mode === "challenge" || !mode) {
    if (geminiKey) {
      try {
        const model = process.env.AI_MODEL || "gemini-2.5-flash";
        return await generateViaGemini(options, geminiKey, model);
      } catch (err) {
        console.warn(`[AI Generator - Gemini] Gemini API notice: ${err instanceof Error ? err.message : String(err)}. Engaging backup.`);
      }
    }

    // Grok backup for Classic/Challenge if Gemini fails
    if (groqKey) {
      try {
        const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
        return await generateViaOpenAICompatible(options, "https://api.groq.com/openai/v1", groqKey, model);
      } catch {
        // Continue to fallback
      }
    }
  }

  // Guaranteed verified fallback questions strictly 1975-2026 for the 6 sports
  return generateFallbackQuestions(options);
}

