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
 * Detailed factual ground-truth knowledge anchors for all 37 tournaments and leagues.
 * Supplies exact years, champions, runner-ups, and statistical benchmarks to eliminate hallucinations.
 */
export function getTournamentContext(tournament?: string): string {
  if (!tournament || tournament.startsWith("All")) return "";
  const t = tournament.toLowerCase();

  // ── 1. CRICKET TOURNAMENTS ──────────────────────────────────────────────
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
- Key Records: Chris Gayle 175* off 66 balls in 2013 (highest individual score). SRH 287/3 in 2024 (highest team total). Virat Kohli 973 runs in 2016 (most runs in a season). Dwayne Bravo & Harshal Patel 32 wickets in a season (most wickets). Yuzvendra Chahal all-time highest wicket-taker. Virat Kohli all-time highest run-scorer.`;
  }

  if (t.includes("t20 world cup")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "ICC Men's T20 World Cup":
- Champions & Key Moments:
  2007: India beat Pakistan (Dhoni captaincy, Joginder Sharma to Misbah scoop)
  2009: Pakistan beat Sri Lanka at Lord's (Younis Khan captain, Shahid Afridi MoM)
  2010: England beat Australia in Barbados (Paul Collingwood captain, Kevin Pietersen Player of Tournament)
  2012: West Indies beat Sri Lanka in Colombo (Marlon Samuels 78)
  2014: Sri Lanka beat India in Mirpur (Sangakkara 52*, Malinga captain)
  2016: West Indies beat England in Kolkata (Carlos Brathwaite 4 sixes off Ben Stokes)
  2021: Australia beat New Zealand in Dubai (Mitchell Marsh 77*, David Warner Player of Tournament)
  2022: England beat Pakistan in Melbourne (Sam Curran 3/12 MoM & Player of Tournament, Ben Stokes 52*)
  2024: India beat South Africa in Barbados (Rohit Sharma captain, Virat Kohli 76, Bumrah 2/18, Surya catch)
- ZERO TITLES: South Africa, New Zealand, Bangladesh have NEVER won a Men's T20 World Cup.`;
  }

  if (t.includes("cricket world cup") || (t.includes("world cup") && !t.includes("t20") && !t.includes("fifa") && !t.includes("basketball"))) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "ICC Cricket World Cup (ODI)":
- Champions & Finalists (1975-2023):
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
  2023: Australia beat India in Ahmedabad (Travis Head 137, Pat Cummins captain, Australia 6th title)
- ZERO TITLES: South Africa and New Zealand have NEVER won an ODI Cricket World Cup.`;
  }

  if (t.includes("champions trophy")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "ICC Champions Trophy":
- Champions & Key Finals:
  1998 (Inaugural / ICC KnockOut): South Africa beat West Indies in Dhaka (Jacques Kallis MoM - SA's only senior ICC trophy).
  2000: New Zealand beat India in Nairobi (Chris Cairns 102*).
  2002: India and Sri Lanka declared joint winners (final rained out twice in Colombo).
  2004: West Indies beat England at The Oval (Ian Bradshaw & Courtney Browne 9th-wicket partnership).
  2006: Australia beat West Indies in Mumbai (Shane Watson & Damien Martyn).
  2009: Australia beat New Zealand in Centurion (Shane Watson 105* in final).
  2013: India beat England in 20-over rain-shortened match at Edgbaston (Dhoni captain, Jadeja MoM).
  2017: Pakistan beat India by 180 runs at The Oval (Fakhar Zaman 114, Mohammad Amir 3/16 spell).`;
  }

  if (t.includes("world test championship") || t.includes("wtc")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "ICC World Test Championship":
- Inaugural 2019-2021 Final: New Zealand defeated India by 8 wickets at Southampton (Kane Williamson captain, Kyle Jamieson Player of the Match).
- 2021-2023 Final: Australia defeated India by 209 runs at The Oval, London (Pat Cummins captain, Travis Head 163, Steve Smith 121).
- ZERO TITLES: India was the runner-up in both finals (2021 and 2023) and has never won the World Test Championship Mace.`;
  }

  if (t.includes("ashes")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "The Ashes Series":
- Strictly bilateral Test cricket series between England and Australia only (1882 to present).
- Iconic Modern Series (1981-2023):
  1981 Botham's Ashes: Ian Botham 149* at Headingley after England followed on, Bob Willis 8/43.
  1993: Shane Warne bowled Mike Gatting with the famous "Ball of the Century" at Old Trafford.
  2005: England won 2-1 (Michael Vaughan captain, Edgbaston 2-run victory, Andrew Flintoff & Kevin Pietersen).
  2006-07: Australia won 5-0 whitewash (Shane Warne, Glenn McGrath, Justin Langer farewell series).
  2010-11: England won 3-1 in Australia (Alastair Cook scored 766 runs, Andrew Strauss captain).
  2013-14: Australia won 5-0 whitewash (Mitchell Johnson took 37 wickets at 13.97).
  2019: Drawn 2-2 in England (Ben Stokes 135* at Headingley with Jack Leach 1*, Steve Smith 774 runs).
  2023: Drawn 2-2 in England (Stuart Broad took the final wicket of his career with his last ball).`;
  }

  // ── 2. FOOTBALL TOURNAMENTS ─────────────────────────────────────────────
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
- All-time top scorers: Cristiano Ronaldo (140 goals), Lionel Messi (129), Robert Lewandowski.`;
  }

  if (t.includes("fifa world cup") || (t.includes("world cup") && !t.includes("cricket") && !t.includes("basketball"))) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "FIFA World Cup":
- Real Champions & Finalists (1978-2022):
  1978: Argentina beat Netherlands 3-1 AET (Mario Kempes)
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
- ZERO TITLES: Netherlands, Portugal, Belgium, and post-1966 England have NEVER won a FIFA World Cup.
- Records: Miroslav Klose 16 all-time goals. Pele only player with 3 World Cups.`;
  }

  if (t.includes("premier league")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Premier League":
- Era: 1992 to 2024.
- Champions: Manchester United (13 titles), Manchester City (8 titles, 4-in-a-row 2021-2024), Chelsea (5), Arsenal (3 - 2003-04 Invincibles 38 games unbeaten), Blackburn Rovers (1994-95), Leicester City (2015-16 miracle under Ranieri), Liverpool (2019-20 under Klopp).
- ZERO TITLES (Never say these won the Premier League post-1992): Tottenham Hotspur, Newcastle United, Everton, Aston Villa.
- Records: Alan Shearer 260 goals (all-time top scorer). Erling Haaland 36 goals in 2022-23 (single-season record). Ryan Giggs 162 assists (most assists). Man City 100 points in 2017-18 ("Centurions").`;
  }

  if (t.includes("la liga")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "La Liga":
- Champions: Real Madrid (36 titles), Barcelona (27 titles), Atletico Madrid (11 titles, 2014 & 2021 under Simeone), Valencia (2002, 2004 under Benitez), Deportivo La Coruna (2000).
- Records: Lionel Messi 474 goals (all-time top scorer for Barcelona). Cristiano Ronaldo 311 goals (in 292 games for Real Madrid). Centurion seasons: Real Madrid 2011-12 (Mourinho, 100 pts), Barcelona 2012-13 (Vilanova, 100 pts).`;
  }

  if (t.includes("euro") || t.includes("european championship")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "UEFA European Championship":
- Champions: 1976 Czechoslovakia (Panenka penalty), 1980 West Germany, 1984 France (Platini 9 goals record), 1988 Netherlands (Van Basten volley vs USSR), 1992 Denmark (fairy tale winners after Yugoslavia ban), 1996 Germany (Bierhoff golden goal vs Czech Rep), 2000 France (Trezeguet golden goal vs Italy), 2004 Greece (Angelos Charisteas beat Portugal 1-0 shock), 2008 Spain (Torres vs Germany 1-0), 2012 Spain (beat Italy 4-0), 2016 Portugal (Eder 109th min vs France 1-0), 2020 Italy (beat England on penalties at Wembley), 2024 Spain (Oyarzabal 86' beat England 2-1).
- ZERO TITLES: England has NEVER won the UEFA European Championship (lost finals in 2020 and 2024).`;
  }

  if (t.includes("copa")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Copa América":
- Champions: Argentina (16 titles, won 2021 in Maracana & 2024 in Miami), Uruguay (15 titles, won 2011), Brazil (9 titles, won 2019, 2007, 2004, 1999, 1997, 1989), Chile (2015, 2016 Centenario - both on penalties vs Argentina), Colombia (2001).`;
  }

  // ── 3. BASKETBALL TOURNAMENTS ───────────────────────────────────────────
  if (t.includes("nba finals") || t.includes("playoffs")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "NBA Finals & Playoffs":
- Champions & MVPs (1991-2024):
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

  if (t.includes("regular season") || t.includes("all-star")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "NBA Regular Season & All-Star":
- MVP Benchmarks: Kareem Abdul-Jabbar (6 MVPs), Michael Jordan (5 MVPs), LeBron James (4 MVPs: 2009, 2010, 2012, 2013), Nikola Jokic (3 MVPs: 2021, 2022, 2024), Stephen Curry (unanimous MVP in 2016).
- Historic Single-Season Records: Golden State Warriors 73-9 in 2015-16 (best record). Chicago Bulls 72-10 in 1995-96.
- Individual Records: Kobe Bryant 81 points vs Raptors in Jan 2006. LeBron James broke all-time scoring record in Feb 2023 (surpassing Kareem's 38,387 points).
- All-Star Records: Anthony Davis 52 points (2017), Jayson Tatum 55 points (2023 Kobe Bryant All-Star MVP). Slam Dunk Contest: Vince Carter (2000), Zach LaVine vs Aaron Gordon (2016), Mac McClung (2023, 2024).`;
  }

  if (t.includes("fiba") || t.includes("basketball world cup")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "FIBA Basketball World Cup":
- Champions & MVPs (1986-2023):
  1994: USA won in Canada (Shaquille O'Neal MVP, Dream Team II)
  1998: Yugoslavia won in Greece (Dejan Bodiroga)
  2002: Yugoslavia won in Indianapolis, USA (Dirk Nowitzki tournament MVP despite Germany taking bronze)
  2006: Spain won in Japan (Pau Gasol MVP, defeated Greece 73-47 in final)
  2010: USA won in Turkey (Kevin Durant MVP, defeated Turkey 81-64)
  2014: USA won in Spain (Kyrie Irving MVP, defeated Serbia 129-92)
  2019: Spain won in China (Ricky Rubio MVP, defeated Argentina 95-75 in Beijing)
  2023: Germany won in Manila (Dennis Schroder MVP, defeated Serbia 83-77, Germany's first-ever FIBA title)`;
  }

  if (t.includes("olympic") && (t.includes("basketball") || t.includes("hoops"))) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Olympic Men's Basketball":
- Gold Medalists & Key Moments (1992-2024):
  1992 Barcelona: USA "The Dream Team" (Michael Jordan, Magic Johnson, Larry Bird, Charles Barkley - won every game by 32+ pts).
  1996 Atlanta: USA "Dream Team II" won gold vs Yugoslavia.
  2000 Sydney: USA won gold vs France (Vince Carter's "Dunk of Death" over 7'2" Frederic Weis).
  2004 Athens: ARGENTINA won gold ("Golden Generation" led by Manu Ginobili, knocked out USA 89-81 in semifinals).
  2008 Beijing: USA "The Redeem Team" (Kobe Bryant, LeBron James, Dwyane Wade beat Spain 118-107).
  2012 London: USA beat Spain 107-100 in final (Kevin Durant 30 pts).
  2016 Rio: USA beat Serbia 96-66 for gold.
  2020 Tokyo (in 2021): USA beat France 87-82 (Kevin Durant 29 pts).
  2024 Paris: USA beat France 98-87 (Stephen Curry hit four 3-pointers in final 3 minutes, LeBron James MVP).`;
  }

  if (t.includes("euroleague")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "EuroLeague":
- Most Titles: Real Madrid (11 titles, won 2015, 2018 with Luka Doncic MVP, 2023 Sergio Llull championship shot).
- Champions & Final Fours:
  Panathinaikos (7 titles, won 2024 under Ergin Ataman, Kostas Sloukas Final Four MVP).
  CSKA Moscow (8 titles, won 2006, 2008, 2016, 2019 under Dimitris Itoudis).
  Maccabi Tel Aviv (6 titles, won 2004, 2005, 2014 under David Blatt).
  Olympiacos (back-to-back 2012 & 2013 titles led by Vassilis Spanoulis).
  Anadolu Efes (back-to-back 2021 & 2022 titles led by Vasilije Micic and Shane Larkin).
  Fenerbahce (2017 title under legendary coach Zeljko Obradovic).
- Legendary Coach: Zeljko Obradovic has won a record 9 EuroLeague titles across 5 different clubs.`;
  }

  // ── 4. FORMULA 1 TOURNAMENTS & GRANDS PRIX ──────────────────────────────
  if (t.includes("drivers' championship") || t.includes("world drivers") || t.includes("formula 1") || t.includes("f1")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "World Drivers' Championship (Formula 1)":
- All-Time Championship Records:
  Michael Schumacher (7 titles: 1994, 1995 with Benetton; 2000-2004 five-in-a-row with Ferrari).
  Lewis Hamilton (7 titles: 2008 with McLaren; 2014, 2015, 2017-2020 with Mercedes).
  Max Verstappen (4 titles: 2021 Abu Dhabi last lap, 2022, 2023 with record 19 wins, 2024 with Red Bull).
  Sebastian Vettel (4 titles: 2010-2013 four-in-a-row with Red Bull; youngest champion at age 23 in 2010).
  Alain Prost (4 titles: 1985, 1986, 1989 with McLaren, 1993 with Williams).
  Ayrton Senna (3 titles: 1988, 1990, 1991 with McLaren-Honda).
  Fernando Alonso (2 titles: 2005, 2006 with Renault).
  Kimi Raikkonen (2007 with Ferrari - Ferrari's last Drivers' Champion).
  Jenson Button (2009 with Brawn GP). Nico Rosberg (2016 with Mercedes).`;
  }

  if (t.includes("monaco")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Monaco Grand Prix":
- Circuit de Monaco (Monte Carlo street track):
  Most Wins: Ayrton Senna record 6 wins (1987, 1989, 1990, 1991, 1992, 1993).
  Graham Hill & Michael Schumacher: 5 wins each. Alain Prost: 4 wins. Lewis Hamilton: 3 wins (2008, 2016, 2019).
  1996 Monaco GP: Olivier Panis shock win for Ligier from 14th on the grid in pouring rain; only 3 cars crossed the finish line.
  2024 Monaco GP: Charles Leclerc won from pole position for Ferrari, becoming the first Monegasque driver to win his home race since Louis Chiron in 1931.`;
  }

  if (t.includes("silverstone") || t.includes("british grand prix")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "British Grand Prix (Silverstone)":
- Silverstone Circuit:
  Most Wins: Lewis Hamilton record 9 wins (2008, 2014, 2015, 2016, 2017, 2019, 2020, 2021, 2024).
  2008: Lewis Hamilton won by a staggering 68 seconds in heavy wet conditions.
  2020: Lewis Hamilton won on 3 tires after a front-left puncture on the final lap.
  2022: Carlos Sainz claimed his maiden Formula 1 victory for Ferrari from pole position.
  2024: Lewis Hamilton won for Mercedes, breaking a 945-day winless streak.`;
  }

  if (t.includes("monza") || t.includes("italian grand prix")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Italian Grand Prix (Monza)":
- Autodromo Nazionale Monza ("Temple of Speed"):
  Most Wins: Michael Schumacher and Lewis Hamilton (5 wins each).
  2008: 21-year-old Sebastian Vettel scored an incredible wet-weather maiden win for Scuderia Toro Rosso.
  2019: Charles Leclerc held off both Mercedes to score Ferrari's first home Monza win since 2010.
  2020: Pierre Gasly scored a shock maiden win for AlphaTauri after a chaotic red-flag restart.
  2021: Daniel Ricciardo won for McLaren (McLaren 1-2 with Lando Norris following a Verstappen-Hamilton crash at Rettifilo).
  2024: Charles Leclerc won with an audacious 1-stop tire strategy for Ferrari.`;
  }

  if (t.includes("abu dhabi")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Abu Dhabi Grand Prix (Yas Marina)":
- Historic Deciders & Races:
  2010: Sebastian Vettel won from pole to become youngest world champion at age 23 while Fernando Alonso got stuck behind Vitaly Petrov.
  2012: Kimi Raikkonen won for Lotus ("Just leave me alone, I know what to do").
  2016: Nico Rosberg finished 2nd to teammate Lewis Hamilton to secure his only World Championship and retired 5 days later.
  2021: Max Verstappen overtook Lewis Hamilton on lap 58 following a late safety car restart to clinch his maiden World Championship.
  Max Verstappen won 4 consecutive Abu Dhabi GPs from 2020 to 2023.`;
  }

  // ── 5. WWE/WWF TOURNAMENTS & PAY-PER-VIEWS ──────────────────────────────
  if (t.includes("wrestlemania")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "WrestleMania":
- Milestones & Matches (WM 1 to WM 40):
  WM 1 (1985): Hulk Hogan & Mr. T beat Roddy Piper & Paul Orndorff at Madison Square Garden.
  WM 3 (1987): Hulk Hogan body-slammed Andre the Giant at Pontiac Silverdome; Randy Savage vs Ricky Steamboat.
  WM 10 (1994): Razor Ramon vs Shawn Michaels Ladder Match for IC title; Bret Hart won WWF title.
  WM 12 (1996): Shawn Michaels beat Bret Hart in 60-Minute Iron Man match ("Boyhood dream has come true").
  WM 13 (1997): Bret Hart vs Steve Austin submission match (Austin passed out in pool of blood).
  WM 14 (1998): Stone Cold Steve Austin beat Shawn Michaels for WWF title with Mike Tyson as enforcer.
  WM 17 / X-Seven (2001): Austin beat The Rock with Vince McMahon assistance in Houston; TLC II.
  WM 18 (2002): The Rock beat Hollywood Hulk Hogan ("Icon vs Icon" in Toronto Skydome).
  WM 19 (2003): The Rock beat Stone Cold Steve Austin (Austin's final match for 19 years); Lesnar beat Angle.
  WM 20 (2004): Chris Benoit won World Heavyweight Title triple threat; Eddie Guerrero retained vs Kurt Angle.
  WM 21 (2005): John Cena beat JBL & Batista beat Triple H to win maiden world titles; Edge won first MITB.
  WM 24 (2008): Shawn Michaels retired Ric Flair ("I'm sorry, I love you").
  WM 25 (2009) & WM 26 (2010): The Undertaker vs Shawn Michaels (WM 26 was Career vs Streak, retiring Michaels).
  WM 30 (2014): Daniel Bryan won WWE World Heavyweight Title; Brock Lesnar ended The Undertaker's 21-0 Streak.
  WM 31 (2015): Seth Rollins cashed in Money in the Bank during Lesnar vs Reigns ("Heist of the Century").
  WM 35 (2019): Becky Lynch won first-ever women's main event vs Ronda Rousey & Charlotte Flair.
  WM 40 / XL (2024): Cody Rhodes defeated Roman Reigns in Bloodline Rules match with appearances by Undertaker, The Rock, and John Cena.`;
  }

  if (t.includes("royal rumble")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Royal Rumble":
- All-Time Records & Winners:
  Most victories: Stone Cold Steve Austin (3 wins: 1997, 1998, 2001).
  Two-time winners: Hulk Hogan (1990, 1991), Shawn Michaels (1995 from #1, 1996), Triple H (2002, 2016), Batista (2005, 2014), John Cena (2008 from #30, 2013), Randy Orton (2009, 2017), Edge (2010, 2021 from #1), Brock Lesnar (2003, 2022), Cody Rhodes (2023 from #30, 2024).
  Inaugural winner: 'Hacksaw' Jim Duggan in 1988 (20-man event in Hamilton, Ontario).
  1992 Royal Rumble: Ric Flair entered at #3 and lasted 60+ minutes to win the vacant WWF Championship.
  Fastest elimination: Santino Marella (1.9 seconds by Kane in 2009).
  Most eliminations in single Rumble: Brock Lesnar (13 in 2020) & Braun Strowman (13 in Greatest Royal Rumble).`;
  }

  if (t.includes("summerslam")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "SummerSlam":
- "The Biggest Party of the Summer" (1988-2024):
  1992 SummerSlam at Wembley Stadium: The British Bulldog defeated Bret Hart for the Intercontinental Title in front of 80,000+ fans.
  1998: "Highway to Hell" - Stone Cold Steve Austin defeated The Undertaker; Triple H defeated The Rock in a Ladder Match for the IC title.
  2002: Shawn Michaels returned from 4-year retirement to defeat Triple H in an Unsanctioned Street Fight; Brock Lesnar defeated The Rock to become youngest WWE Champion at age 25.
  2005: Hulk Hogan defeated Shawn Michaels in "Legend vs Icon".
  2013: Daniel Bryan defeated John Cena clean for WWE Title, immediately followed by Randy Orton cashing in MITB with Triple H as guest referee.
  2014: Brock Lesnar delivered 16 German suplexes to demolish John Cena ("Suplex City").
  2016: Finn Balor defeated Seth Rollins to become inaugural Universal Champion (dislocating his shoulder during match).
  2022: Roman Reigns defeated Brock Lesnar in a Last Man Standing match where Lesnar lifted the ring with a tractor.`;
  }

  if (t.includes("survivor series")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Survivor Series":
- "The Thanksgiving Tradition" (1987-2024):
  1990: The Undertaker made his televised WWE debut as the mystery partner of Ted DiBiase's Million Dollar Team.
  1997: "The Montreal Screwjob" - Vince McMahon called for the bell without Bret Hart submitting, awarding the title to Shawn Michaels.
  1998: "Deadly Game" tournament - The Rock turned corporate to capture his maiden WWF Championship.
  2001: "Winner Take All" - Team WWF (The Rock, Chris Jericho, Undertaker, Kane, Big Show) defeated Team Alliance (Stone Cold, Kurt Angle, Rob Van Dam, Booker T, Shane McMahon).
  2002: Inaugural Elimination Chamber match at MSG - Shawn Michaels won the World Heavyweight Championship.
  2014: Sting made his WWE debut, attacking Triple H to help Team Cena defeat The Authority (Dolph Ziggler sole survivor).
  2016: Goldberg returned to WWE and squashed Brock Lesnar in 86 seconds.
  2023: CM Punk made his shock return to WWE in Chicago after a 9-year absence.`;
  }

  if (t.includes("attitude era") || t.includes("world championships")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "Attitude Era & World Championships":
- Era: 1997 to 2002.
- Core Milestones:
  Stone Cold Steve Austin vs Mr. McMahon rivalry (Zamboni ride, beer truck bath in Albany, hospital bed attack with bedpan).
  The Rock ("The People's Champion", 10-time world champion, legendary promos with Mick Foley).
  Mankind (Mick Foley) won the WWF Championship on Raw on Jan 4, 1999 (the pop that "blew the roof off" and flipped ratings vs WCW Nitro).
  D-Generation X (Triple H, Shawn Michaels, Chyna, Road Dogg, Billy Gunn, X-Pac).
  TLC (Tables, Ladders & Chairs) Matches: Edge & Christian vs The Hardy Boyz vs The Dudley Boyz (SummerSlam 2000 & WrestleMania X-Seven).
  The Undertaker's Ministry of Darkness and Brothers of Destruction with Kane.
  Vince McMahon purchasing WCW in March 2001 (simulcast Raw & Nitro).`;
  }

  // ── 6. UFC TOURNAMENTS & PPVS ───────────────────────────────────────────
  if (t.includes("ufc numbered") || t.includes("ppv") || t.includes("numbered")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "UFC Numbered PPVs":
- Key PPVs & Historical Fights:
  UFC 1 (1993): Royce Gracie submitted 3 opponents in Denver to win the inaugural 8-man tournament.
  UFC 100 (2009): Brock Lesnar TKO Frank Mir 2; Georges St-Pierre beat Thiago Alves; Dan Henderson KO Michael Bisping.
  UFC 128 (2011): Jon Jones beat Shogun Rua to become youngest UFC champion at age 23.
  UFC 189 (2015): Robbie Lawler TKO Rory MacDonald in legendary 5-round battle; Conor McGregor TKO Chad Mendes.
  UFC 193 (2015): Holly Holm head-kick KO of undefeated Ronda Rousey in Melbourne.
  UFC 194 (2015): Conor McGregor KO Jose Aldo in 13 seconds (fastest title fight KO in UFC history).
  UFC 196 (2016): Nate Diaz submitted Conor McGregor via rear-naked choke in round 2.
  UFC 205 (2016): Conor McGregor TKO Eddie Alvarez at MSG to become first simultaneous two-division champion.
  UFC 217 (2017): Georges St-Pierre returned after 4 years to choke out Michael Bisping for Middleweight title.
  UFC 229 (2018): Khabib Nurmagomedov submitted Conor McGregor in round 4 (highest PPV buyrate in UFC history: 2.4 million buys).
  UFC 239 (2019): Jorge Masvidal 5-second flying knee KO of Ben Askren (fastest KO in UFC history).
  UFC 287 (2023): Israel Adesanya KO Alex Pereira in round 2 to reclaim Middleweight title.
  UFC 300 (2024): Alex Pereira KO Jamahal Hill in round 1; Max Holloway KO Justin Gaethje at 4:59 of round 5 for BMF title.`;
  }

  if (t.includes("championship fights") || t.includes("world championship")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "UFC World Championship Fights":
- Title Defense Records:
  Demetrious Johnson: 11 consecutive flyweight title defenses (all-time UFC record).
  Anderson Silva: 10 consecutive middleweight defenses and 16-fight UFC win streak.
  Jon Jones: 11 consecutive light heavyweight title defenses, youngest champion at 23, two-division champion (Heavyweight).
- Simultaneous Two-Division Champions (Champ-Champs):
  Conor McGregor (Featherweight & Lightweight), Daniel Cormier (Light Heavyweight & Heavyweight), Amanda Nunes (Bantamweight & Featherweight), Henry Cejudo (Flyweight & Bantamweight), Alex Pereira (Middleweight & Light Heavyweight within 7 UFC fights).
- Undefeated Legend: Khabib Nurmagomedov retired 29-0 (defended title against McGregor, Poirier, Gaethje).`;
  }

  if (t.includes("hall of fame") || t.includes("legends")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "UFC Hall of Fame & Legends":
- Pioneer Wing: Royce Gracie, Ken Shamrock, Dan Severn, Randy Couture, Mark Coleman, Matt Hughes, Tito Ortiz, Chuck Liddell, Don Frye, Bas Rutten, Kazushi Sakuraba.
- Modern Wing: Forrest Griffin, B.J. Penn, Urijah Faber, Ronda Rousey (first female inductee), Michael Bisping, Rashad Evans, Georges St-Pierre, Khabib Nurmagomedov, Daniel Cormier, Jose Aldo, Donald Cerrone, Frankie Edgar, Joanna Jedrzejczyk.
- Fight Wing: Forrest Griffin vs Stephan Bonnar 1 (TUF 1 Finale 2005 - the fight that saved UFC), Jon Jones vs Alexander Gustafsson 1 (UFC 165), Dan Henderson vs Mauricio Rua 1 (UFC 139), Robbie Lawler vs Rory MacDonald 2 (UFC 189), Cub Swanson vs Doo Ho Choi (UFC 206).`;
  }

  if (t.includes("fight night") || t.includes("title eliminators")) {
    return `TOURNAMENT GROUND-TRUTH ANCHORS FOR "UFC Fight Night & Title Eliminators":
- The Ultimate Fighter (TUF) & Fight Night Milestones:
  TUF 1 Finale (April 2005): Forrest Griffin defeated Stephan Bonnar by unanimous decision in a bout credited with securing UFC's television future.
  Fight Night Records: Max Holloway landed 445 significant strikes against Calvin Kattar on Fight Island in Jan 2021 (all-time UFC single-fight record).
  Legendary Fight Night Wars: Chan Sung Jung ('The Korean Zombie') submitted Leonard Garcia with a twister submission (first twister in UFC history, 2011); Dustin Poirier vs Dan Hooker (Apex 2020 5-round slugfest); Kelvin Gastelum vs Israel Adesanya (UFC 236 interim title bout).`;
  }

  return "";
}

/**
 * Builds the AI system prompt enforcing sports factuality, credible options, strict JSON format,
 * zero repetition, and strict temporal boundary (1975-2026 only).
 */
export function buildPrompt(options: GenerateOptions): string {
  const { sport, difficulty, count, category, excludeStems, excludeAnswers } = options;

  const isTournamentSpecific = Boolean(
    category &&
    !category.startsWith("All") &&
    category !== "All Tournaments" &&
    category !== "All Events" &&
    category !== "All Grand Prix"
  );

  let sportInstruction = "";
  if (isTournamentSpecific) {
    sportInstruction = `STRICT TOURNAMENT ISOLATION (MANDATORY):
Every single one of the ${count} questions MUST strictly, exclusively, and directly test real events, champions, matches, and records from "${category}".
DO NOT generate general sports questions or questions from other leagues, tournaments, or competitions outside "${category}".
- If "${category}" is an IPL tournament, every question must be about the Indian Premier League (teams: CSK, MI, KKR, RCB, SRH, RR, GT, DC, PBKS, LSG; IPL finals, records, Orange/Purple caps). DO NOT include World Cup, Ashes, or international cricket.
- If "${category}" is UEFA Champions League, every question must be about UEFA Champions League / European Cup matches, finals, and records. DO NOT include World Cup or domestic leagues.
- If "${category}" is The Ashes, every question must be about the England vs Australia Test series.
- If "${category}" is WrestleMania, every question must be about WrestleMania matches and moments.
All 4 options must be entities, teams, or players relevant to "${category}".`;
  } else if (sport === "All Sports") {
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
  const categoryInstruction = isTournamentSpecific
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
      ? `\nNON-REPETITION CONSTRAINT (CRITICAL - 1000 UNIQUE QUESTIONS MANDATE):
DO NOT generate any questions similar to these already-seen question stems, and DO NOT make any of these answers the correct answer:
- Stems strictly forbidden: ${excludeStems?.slice(0, 120).join("; ") || "None"}
- Answers strictly forbidden: ${excludeAnswers?.slice(0, 80).join("; ") || "None"}
If any question covers an already asked topic or duplicates any of the above, it will be automatically discarded.`
      : "";

  // Dynamic Era Partitioning to guarantee 1000 unique questions over 100 games
  const eraPartitions = [
    "ERA FOCUS: Modern Era (2020 to 2026) - highlight recent tournament champions, breakout phenoms, and latest record-breaking moments.",
    "ERA FOCUS: Decade of Dynasties (2010 to 2019) - highlight peak dominance, statistical revolutions, and iconic finals.",
    "ERA FOCUS: Millennium Shift (2000 to 2009) - highlight early 2000s classics, foundational franchise milestones, and legendary superstars.",
    "ERA FOCUS: 90s Golden Age (1990 to 1999) - highlight historic upsets, dramatic world cup showdowns, and memorable legends.",
    "ERA FOCUS: Balanced Historical Spectrum (1975 to 2026) - distribute questions evenly across different eras.",
  ];
  const chosenEra = eraPartitions[Math.floor(Math.random() * eraPartitions.length)];

  // Dynamic Variety Angles to guarantee questions never repeat continuously
  const varietyAngles = [
    "Angle A: Iconic Championship Finals & Title Matches (exact years, scorelines, winning goals/baskets/wickets)",
    "Angle B: Legendary Individual Records & Statistical Benchmarks (single-season or all-time records)",
    "Angle C: Historic Upsets, Dramatic Comebacks & Underdog Fairytales",
    "Angle D: Major Individual Awards (Player of the Tournament, MVP, Golden Boot/Ball, Orange/Purple Cap)",
    "Angle E: Tactical Masterclasses, Death-Over / Stoppage-Time Thrillers & Sudden Death",
    "Angle F: Memorable Controversies, Iconic Drama, Decisive Clutch Moments & Host Venues",
  ];
  const selectedVariety = [...varietyAngles].sort(() => Math.random() - 0.5).slice(0, 3).join("\n- ");

  const randomSeed = `Entropy Seed: ${Date.now()}-${Math.floor(Math.random() * 1000000)}-${Math.random().toString(36).slice(2, 7)}`;

  return `You are the world's leading sports trivia archivist and competition historian.
Generate exactly ${count} unique, factually verified sports trivia questions adhering strictly to these specifications:

SPECIFICATIONS:
- Target Sport: ${sport}
- Target Difficulty: ${difficulty}
${sportInstruction}

${diffInstruction}

${categoryInstruction}
${excludeSection}

ROUND VARIETY & ERA DIRECTIVES:
- ${chosenEra}
- ${selectedVariety}

${randomSeed}

STRICT TEMPORAL RULES (CRITICAL):
1. ALL TRIVIA MUST BE BETWEEN 1975 AND 2026:
   - Every question MUST refer to matches, champions, records, fights, or events that occurred between 1975 and 2026.
   - ABSOLUTELY NO questions from before 1975 (no 1930s, 1950s, 1960s, or early 1970s). Any pre-1975 question will be strictly rejected.
   - ACTIVELY INCLUDE modern events from the 2020s (2020, 2021, 2022, 2023, 2024, 2025, 2026).
   - The "year" field must be an integer between 1975 and 2026.

QUALITY & ANTI-HALLUCINATION RULES:
2. FACTUAL ACCURACY: Never hallucinate or guess scores, winners, or stats. Use only 100% verified historical facts.
3. 4 PLAUSIBLE OPTIONS: Exactly 4 options per question. All 4 must be plausible peers of the exact same category and era.
4. UNBIASED POSITION: The correct answer must be naturally distributed among options (do NOT place answer at option 0 / A every time).
5. CONCISE EXPLANATION: 1-2 sentence explanation citing the year, tournament, and key context.
6. ZERO DUPLICATES: Every question in this batch must be distinct from one another and distinct from previous rounds.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object containing a single "questions" key with an array of question objects.
Do not include markdown code fences (like \`\`\`json) or conversational text.
Example format:
{
  "questions": [
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
  ]
}`;
}

/**
 * Clean and parse raw JSON text from AI response with multi-stage auto-repair
 */
function parseAIJsonResponse(rawText: string): RawGeneratedQuestion[] {
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  cleaned = cleaned.trim();

  // 1. Try parsing directly
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as RawGeneratedQuestion[];
    }
    if (parsed && typeof parsed === "object") {
      const arr = Object.values(parsed).find((v) => Array.isArray(v) && v.length > 0);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr as RawGeneratedQuestion[];
      }
    }
  } catch {
    // Continue to slicing & auto-repair
  }

  // 2. Slice JSON object { "questions": [...] }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    let slice = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(slice);
      const arr = Object.values(parsed).find((v) => Array.isArray(v) && v.length > 0);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr as RawGeneratedQuestion[];
      }
    } catch {
      // Auto-repair trailing commas: ,} or ,]
      slice = slice.replace(/,\s*([}\]])/g, "$1");
      // Fix misplaced quotes like "year": 2004",
      slice = slice.replace(/"year":\s*(\d{4})",/g, '"year": $1,');
      try {
        const parsed = JSON.parse(slice);
        const arr = Object.values(parsed).find((v) => Array.isArray(v) && v.length > 0);
        if (Array.isArray(arr) && arr.length > 0) {
          return arr as RawGeneratedQuestion[];
        }
      } catch {
        // Fall through to array slice
      }
    }
  }

  // 3. Slice JSON array [ ... ]
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    let slice = cleaned.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as RawGeneratedQuestion[];
      }
    } catch {
      slice = slice.replace(/,\s*([}\]])/g, "$1");
      slice = slice.replace(/"year":\s*(\d{4})",/g, '"year": $1,');
      try {
        const parsed = JSON.parse(slice);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as RawGeneratedQuestion[];
        }
      } catch {
        // Fall through to regex extraction
      }
    }
  }

  // 4. Regex fallback: extract individual complete question objects from partial text
  const objectRegex = /\{\s*"sport"[\s\S]*?"explanation"\s*:\s*"(?:\\.|[^"\\])*"\s*\}/g;
  const matches = cleaned.match(objectRegex);
  if (matches && matches.length > 0) {
    const questions: RawGeneratedQuestion[] = [];
    for (const m of matches) {
      try {
        const cleanItem = m.replace(/,\s*([}\]])/g, "$1").replace(/"year":\s*(\d{4})",/g, '"year": $1,');
        const q = JSON.parse(cleanItem);
        if (q.question && Array.isArray(q.options) && q.options.length === 4) {
          questions.push(q);
        }
      } catch {}
    }
    if (questions.length > 0) {
      return questions;
    }
  }

  throw new Error("AI response was not a valid JSON question structure.");
}

/**
 * Generate questions via Google Gemini REST API.
 * Uses temperature 0.7 for high variety and creative diversity while anchored in verified truth.
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
        temperature: 0.7,
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
 * Generate questions via Groq / xAI / OpenAI-compatible REST API.
 * Automatically tries active candidate models (prioritizing openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b).
 */
async function generateViaOpenAICompatible(
  options: GenerateOptions,
  baseUrl: string,
  apiKey: string,
  preferredModel: string
): Promise<RawGeneratedQuestion[]> {
  // Candidate models supported on user's Groq account
  const candidateModels = [
    preferredModel,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const prompt = buildPrompt(options);
      const isReasoningModel = model.includes("gpt-oss") || model.includes("o1") || model.includes("o3");
      const isGroq = baseUrl.includes("groq.com");

      // Give generous token budget so output never truncates
      const tokenBudget = Math.min(Math.max(options.count * 350, 2000), 8000);

      const payload: Record<string, any> = {
        model,
        messages: [
          {
            role: "system",
            content:
              'You are an expert sports trivia engine and competition archivist. You output ONLY valid JSON objects with format {"questions": [...]}. Never include markdown code fences or conversational text.',
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: tokenBudget,
      };

      // Native JSON enforcement
      if (isGroq || baseUrl.includes("openai") || baseUrl.includes("x.ai")) {
        payload.response_format = { type: "json_object" };
      }

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
          // Model unavailable or rate-limited; advance to next candidate
          continue;
        }
        throw new Error(`AI API error (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        continue;
      }

      const parsed = parseAIJsonResponse(content);
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Failed to generate questions via AI provider");
}

/**
 * Curated sports trivia fallback engine strictly 1975-2026.
 * Tagged by tournament to provide tournament-aware fallbacks if offline.
 */
function generateFallbackQuestions(options: GenerateOptions): RawGeneratedQuestion[] {
  const sports = options.sport === "All Sports" ? [...SPORT_LIST] : [options.sport];
  const targetDiff = options.difficulty;
  const count = options.count;
  const targetCategory = options.category;

  interface CuratedItem {
    q: string;
    opts: [string, string, string, string];
    a: string;
    exp: string;
    diff: Difficulty;
    yr: number;
    cat: string;
  }

  const factsBank: Record<Sport, CuratedItem[]> = {
    Cricket: [
      { q: "Which team won the inaugural Indian Premier League (IPL) title in 2008 under Shane Warne?", opts: ["Rajasthan Royals", "Chennai Super Kings", "Delhi Daredevils", "Kings XI Punjab"], a: "Rajasthan Royals", exp: "Rajasthan Royals defeated CSK by 3 wickets in the 2008 final at DY Patil Stadium.", diff: "Easy", yr: 2008, cat: "Indian Premier League (IPL)" },
      { q: "Who scored an unbeaten 175 off 66 balls in IPL 2013, the highest individual score in IPL history?", opts: ["Chris Gayle", "Brendon McCullum", "AB de Villiers", "KL Rahul"], a: "Chris Gayle", exp: "Chris Gayle smashed 175* for Royal Challengers Bangalore against Pune Warriors India.", diff: "Easy", yr: 2013, cat: "Indian Premier League (IPL)" },
      { q: "Who holds the record for the most runs in a single IPL season with 973 runs in 2016?", opts: ["Virat Kohli", "David Warner", "Jos Buttler", "Shubman Gill"], a: "Virat Kohli", exp: "Virat Kohli scored 973 runs including 4 centuries for RCB in IPL 2016.", diff: "Easy", yr: 2016, cat: "Indian Premier League (IPL)" },
      { q: "Which franchise won their maiden IPL championship in their debut season in 2022 under Hardik Pandya?", opts: ["Gujarat Titans", "Lucknow Super Giants", "Rajasthan Royals", "Royal Challengers Bangalore"], a: "Gujarat Titans", exp: "Gujarat Titans defeated Rajasthan Royals by 7 wickets in the 2022 final in Ahmedabad.", diff: "Medium", yr: 2022, cat: "Indian Premier League (IPL)" },
      { q: "Which team won the 2024 IPL championship by defeating Sunrisers Hyderabad in the final in Chennai?", opts: ["Kolkata Knight Riders", "Sunrisers Hyderabad", "Rajasthan Royals", "Royal Challengers Bengaluru"], a: "Kolkata Knight Riders", exp: "KKR won their third IPL title under Shreyas Iyer's captaincy in 2024.", diff: "Medium", yr: 2024, cat: "Indian Premier League (IPL)" },
      { q: "Who captained India to their historic victory in the inaugural 2007 ICC World Twenty20 in South Africa?", opts: ["MS Dhoni", "Rahul Dravid", "Sourav Ganguly", "Yuvraj Singh"], a: "MS Dhoni", exp: "MS Dhoni led India to defeat Pakistan in the Johannesburg final in 2007.", diff: "Easy", yr: 2007, cat: "ICC Men's T20 World Cup" },
      { q: "Which nation won the 2024 ICC Men's T20 World Cup by defeating South Africa in the final?", opts: ["India", "South Africa", "England", "Australia"], a: "India", exp: "India won by 7 runs in Barbados with Virat Kohli scoring 76 and Jasprit Bumrah taking 2/18.", diff: "Medium", yr: 2024, cat: "ICC Men's T20 World Cup" },
      { q: "Who hit 4 consecutive sixes off Ben Stokes in the final over of the 2016 ICC Men's T20 World Cup Final?", opts: ["Carlos Brathwaite", "Marlon Samuels", "Chris Gayle", "Andre Russell"], a: "Carlos Brathwaite", exp: "Carlos Brathwaite powered West Indies to victory with 4 consecutive sixes at Eden Gardens.", diff: "Hard", yr: 2016, cat: "ICC Men's T20 World Cup" },
      { q: "Which nation won the inaugural ICC Men's Cricket World Cup held in England in 1975?", opts: ["West Indies", "Australia", "England", "Pakistan"], a: "West Indies", exp: "Clive Lloyd led the West Indies to victory over Australia in the 1975 final at Lord's.", diff: "Medium", yr: 1975, cat: "ICC Cricket World Cup" },
      { q: "Which team won the 2019 ICC Men's Cricket World Cup final at Lord's on boundary countback?", opts: ["England", "New Zealand", "Australia", "India"], a: "England", exp: "England won following a tied match and tied Super Over against New Zealand.", diff: "Medium", yr: 2019, cat: "ICC Cricket World Cup" },
      { q: "Who scored the winning boundary/six for India in the 2011 ICC Cricket World Cup final in Mumbai?", opts: ["MS Dhoni", "Gautam Gambhir", "Yuvraj Singh", "Sachin Tendulkar"], a: "MS Dhoni", exp: "MS Dhoni hit a six off Nuwan Kulasekara to finish on 91* as India won the 2011 World Cup.", diff: "Easy", yr: 2011, cat: "ICC Cricket World Cup" },
      { q: "Who bowled the famous 'Ball of the Century' to dismiss Mike Gatting in the 1993 Ashes Test at Old Trafford?", opts: ["Shane Warne", "Glenn McGrath", "Merv Hughes", "Craig McDermott"], a: "Shane Warne", exp: "Shane Warne's delivery pitched outside leg and clipped top of off stump.", diff: "Medium", yr: 1993, cat: "The Ashes Series" },
      { q: "Who scored an unbeaten 135 to lead England to a miracle 1-wicket Ashes victory at Headingley in 2019?", opts: ["Ben Stokes", "Joe Root", "Jonny Bairstow", "Jos Buttler"], a: "Ben Stokes", exp: "Ben Stokes and Jack Leach (1*) shared a 76-run last-wicket stand to win at Headingley.", diff: "Hard", yr: 2019, cat: "The Ashes Series" },
      { q: "Which team won the inaugural ICC World Test Championship (2019-2021) by defeating India in Southampton?", opts: ["New Zealand", "Australia", "England", "South Africa"], a: "New Zealand", exp: "Kane Williamson led New Zealand to an 8-wicket victory with Kyle Jamieson named Player of the Match.", diff: "Medium", yr: 2021, cat: "ICC World Test Championship" },
      { q: "Which team defeated India by 180 runs in the 2017 ICC Champions Trophy Final at The Oval?", opts: ["Pakistan", "Sri Lanka", "England", "South Africa"], a: "Pakistan", exp: "Fakhar Zaman scored 114 and Mohammad Amir took 3/16 to seal Pakistan's victory.", diff: "Medium", yr: 2017, cat: "ICC Champions Trophy" },
    ],
    Football: [
      { q: "Which national team won the 2022 FIFA World Cup in Qatar?", opts: ["Argentina", "France", "Croatia", "Morocco"], a: "Argentina", exp: "Argentina defeated France 4-2 on penalties following an epic 3-3 draw.", diff: "Easy", yr: 2022, cat: "FIFA World Cup" },
      { q: "Who won the 2010 FIFA World Cup Final for Spain with a 116th-minute goal against the Netherlands?", opts: ["Andrés Iniesta", "Xavi Hernández", "Fernando Torres", "David Villa"], a: "Andrés Iniesta", exp: "Iniesta scored in the 116th minute at Soccer City in Johannesburg.", diff: "Easy", yr: 2010, cat: "FIFA World Cup" },
      { q: "Which club won the 2023 UEFA Champions League final against Inter Milan to complete a European treble?", opts: ["Manchester City", "Inter Milan", "Real Madrid", "Bayern Munich"], a: "Manchester City", exp: "Manchester City defeated Inter 1-0 in Istanbul with a goal from Rodri.", diff: "Easy", yr: 2023, cat: "UEFA Champions League" },
      { q: "Who scored the 92:48 stoppage-time header for Real Madrid in the 2014 Champions League final against Atlético Madrid?", opts: ["Sergio Ramos", "Cristiano Ronaldo", "Gareth Bale", "Ángel Di María"], a: "Sergio Ramos", exp: "Sergio Ramos forced extra time where Real Madrid went on to win 4-1 for 'La Décima'.", diff: "Hard", yr: 2014, cat: "UEFA Champions League" },
      { q: "Which club completed an entire 38-game Premier League season undefeated in 2003-04?", opts: ["Arsenal", "Manchester United", "Chelsea", "Liverpool"], a: "Arsenal", exp: "Arsène Wenger's Arsenal 'Invincibles' went unbeaten throughout the 2003-04 league campaign.", diff: "Easy", yr: 2004, cat: "Premier League" },
      { q: "Who broke the Premier League single-season scoring record with 36 goals in 2022-23?", opts: ["Erling Haaland", "Harry Kane", "Mohamed Salah", "Alan Shearer"], a: "Erling Haaland", exp: "Erling Haaland scored 36 Premier League goals in his debut season for Manchester City.", diff: "Easy", yr: 2023, cat: "Premier League" },
      { q: "Which country won the UEFA Euro 2004 tournament in one of the biggest upsets in football history?", opts: ["Greece", "Portugal", "Czech Republic", "Netherlands"], a: "Greece", exp: "Greece defeated tournament hosts Portugal 1-0 in Lisbon to win Euro 2004.", diff: "Medium", yr: 2004, cat: "UEFA European Championship" },
      { q: "Who scored the winning goal for Spain in the 86th minute of the UEFA Euro 2024 final against England?", opts: ["Mikel Oyarzabal", "Nico Williams", "Lamine Yamal", "Dani Olmo"], a: "Mikel Oyarzabal", exp: "Mikel Oyarzabal tapped in Marc Cucurella's cross to seal a 2-1 victory in Berlin.", diff: "Medium", yr: 2024, cat: "UEFA European Championship" },
      { q: "Which nation won the 2021 Copa América, ending a 28-year major trophy drought?", opts: ["Argentina", "Brazil", "Colombia", "Uruguay"], a: "Argentina", exp: "Ángel Di María scored the only goal at the Maracanã as Argentina beat Brazil 1-0.", diff: "Medium", yr: 2021, cat: "Copa América" },
      { q: "Who is the all-time leading goalscorer in La Liga history with 474 goals?", opts: ["Lionel Messi", "Cristiano Ronaldo", "Telmo Zarra", "Hugo Sánchez"], a: "Lionel Messi", exp: "Lionel Messi scored 474 goals in 520 La Liga appearances for FC Barcelona.", diff: "Easy", yr: 2021, cat: "La Liga" },
    ],
    Basketball: [
      { q: "Who became the NBA's all-time leading regular season scorer in February 2023, surpassing Kareem Abdul-Jabbar?", opts: ["LeBron James", "Michael Jordan", "Kobe Bryant", "Karl Malone"], a: "LeBron James", exp: "LeBron James passed Kareem's 38,387 career points in February 2023.", diff: "Easy", yr: 2023, cat: "NBA Regular Season & All-Star" },
      { q: "Which NBA franchise won 73 regular-season games in 2015-16, setting the all-time single-season record?", opts: ["Golden State Warriors", "Chicago Bulls", "San Antonio Spurs", "Miami Heat"], a: "Golden State Warriors", exp: "The Golden State Warriors finished the 2015-16 regular season with a 73-9 record.", diff: "Easy", yr: 2016, cat: "NBA Regular Season & All-Star" },
      { q: "Which team came back from a 3-1 deficit to win the 2016 NBA Finals?", opts: ["Cleveland Cavaliers", "Golden State Warriors", "Oklahoma City Thunder", "Toronto Raptors"], a: "Cleveland Cavaliers", exp: "LeBron James and the Cavaliers defeated the 73-9 Warriors in Game 7.", diff: "Easy", yr: 2016, cat: "NBA Finals & Playoffs" },
      { q: "Which team won the 2024 NBA Championship by defeating the Dallas Mavericks 4-1?", opts: ["Boston Celtics", "Dallas Mavericks", "Denver Nuggets", "Minnesota Timberwolves"], a: "Boston Celtics", exp: "Jaylen Brown was named Finals MVP as the Celtics won their record 18th NBA title.", diff: "Easy", yr: 2024, cat: "NBA Finals & Playoffs" },
      { q: "Which country defeated Team USA in the semi-finals of men's basketball at the 2004 Athens Olympics?", opts: ["Argentina", "Lithuania", "Spain", "Italy"], a: "Argentina", exp: "Manu Ginobili led Argentina to an 89-81 victory on their way to Olympic Gold.", diff: "Medium", yr: 2004, cat: "Olympic Men's Basketball" },
      { q: "Who won the tournament MVP at the 2023 FIBA Basketball World Cup, leading Germany to their first title?", opts: ["Dennis Schröder", "Bogdan Bogdanović", "Luka Dončić", "Anthony Edwards"], a: "Dennis Schröder", exp: "Dennis Schröder led Germany to an undefeated 8-0 run, beating Serbia in the final.", diff: "Medium", yr: 2023, cat: "FIBA Basketball World Cup" },
      { q: "Which club has won the most EuroLeague basketball championships in history (11 titles)?", opts: ["Real Madrid", "Panathinaikos", "CSKA Moscow", "Maccabi Tel Aviv"], a: "Real Madrid", exp: "Real Madrid won their record 11th EuroLeague title in 2023.", diff: "Medium", yr: 2023, cat: "EuroLeague" },
    ],
    "Formula 1": [
      { q: "Which driver holds the record for most race victories in a single Formula 1 season (19 wins in 2023)?", opts: ["Max Verstappen", "Lewis Hamilton", "Michael Schumacher", "Sebastian Vettel"], a: "Max Verstappen", exp: "Max Verstappen won 19 of 22 Grands Prix in a dominant 2023 campaign.", diff: "Easy", yr: 2023, cat: "World Drivers' Championship" },
      { q: "Who won his first Formula 1 World Championship on the final lap of the 2021 Abu Dhabi Grand Prix?", opts: ["Max Verstappen", "Lewis Hamilton", "Valtteri Bottas", "Lando Norris"], a: "Max Verstappen", exp: "Verstappen overtook Hamilton on lap 58 following a late safety car restart.", diff: "Easy", yr: 2021, cat: "Abu Dhabi Grand Prix" },
      { q: "Which driver won the 2024 Monaco Grand Prix from pole position for Scuderia Ferrari?", opts: ["Charles Leclerc", "Oscar Piastri", "Carlos Sainz", "Lando Norris"], a: "Charles Leclerc", exp: "Charles Leclerc became the first Monegasque driver to win his home race since 1931.", diff: "Easy", yr: 2024, cat: "Monaco Grand Prix" },
      { q: "Who holds the all-time record for the most British Grand Prix victories at Silverstone (9 wins)?", opts: ["Lewis Hamilton", "Alain Prost", "Jim Clark", "Nigel Mansell"], a: "Lewis Hamilton", exp: "Lewis Hamilton won his 9th British Grand Prix at Silverstone in July 2024.", diff: "Easy", yr: 2024, cat: "British Grand Prix (Silverstone)" },
      { q: "Who won the wet 2008 Italian Grand Prix at Monza for Toro Rosso, becoming the youngest race winner at the time?", opts: ["Sebastian Vettel", "Lewis Hamilton", "Fernando Alonso", "Robert Kubica"], a: "Sebastian Vettel", exp: "21-year-old Sebastian Vettel scored an incredible wet-weather maiden victory.", diff: "Hard", yr: 2008, cat: "Italian Grand Prix (Monza)" },
    ],
    "WWE/WWF": [
      { q: "Who famously ended The Undertaker's 21-0 WrestleMania undefeated streak at WrestleMania XXX in 2014?", opts: ["Brock Lesnar", "Roman Reigns", "John Cena", "Triple H"], a: "Brock Lesnar", exp: "Brock Lesnar defeated The Undertaker at WrestleMania XXX in New Orleans, shocking the wrestling world.", diff: "Easy", yr: 2014, cat: "WrestleMania" },
      { q: "Who defeated Roman Reigns in the main event of WrestleMania XL (40) to win the Undisputed WWE Championship?", opts: ["Cody Rhodes", "The Rock", "Seth Rollins", "CM Punk"], a: "Cody Rhodes", exp: "Cody Rhodes finished his story in a Bloodline Rules match at WrestleMania 40 in Philadelphia.", diff: "Easy", yr: 2024, cat: "WrestleMania" },
      { q: "Which WWE superstar won back-to-back Royal Rumble matches in 1997 and 1998, and holds the all-time record with 3 wins?", opts: ["Stone Cold Steve Austin", "The Rock", "Shawn Michaels", "Mankind"], a: "Stone Cold Steve Austin", exp: "Stone Cold Steve Austin won the Royal Rumble in 1997, 1998, and 2001.", diff: "Easy", yr: 1998, cat: "Royal Rumble" },
      { q: "At which SummerSlam did Brock Lesnar defeat John Cena by delivering 16 German suplexes ('Suplex City')?", opts: ["SummerSlam 2014", "SummerSlam 2012", "SummerSlam 2016", "SummerSlam 2018"], a: "SummerSlam 2014", exp: "Brock Lesnar squashed John Cena at SummerSlam 2014 in Los Angeles to win the WWE World Heavyweight Title.", diff: "Medium", yr: 2014, cat: "SummerSlam" },
      { q: "At which Survivor Series event did The Undertaker make his televised WWE debut?", opts: ["Survivor Series 1990", "Survivor Series 1991", "Survivor Series 1989", "Survivor Series 1992"], a: "Survivor Series 1990", exp: "The Undertaker debuted as Ted DiBiase's mystery partner at Survivor Series 1990.", diff: "Medium", yr: 1990, cat: "Survivor Series" },
      { q: "Which iconic rivalry featuring beer truck baths, Zamboni rides, and corporate battles defined the WWF Attitude Era?", opts: ["Stone Cold Steve Austin vs Mr. McMahon", "The Rock vs Triple H", "Mankind vs The Undertaker", "Edge vs Christian"], a: "Stone Cold Steve Austin vs Mr. McMahon", exp: "Stone Cold Steve Austin vs Vince McMahon was the signature feud of the Attitude Era.", diff: "Easy", yr: 1998, cat: "Attitude Era & World Championships" },
    ],
    UFC: [
      { q: "Who holds the record for the fastest knockout in UFC history, finishing Ben Askren in just 5 seconds in 2019?", opts: ["Jorge Masvidal", "Conor McGregor", "Duane Ludwig", "Francis Ngannou"], a: "Jorge Masvidal", exp: "Jorge Masvidal landed a flying knee at UFC 239 in July 2019 to score a 5-second knockout.", diff: "Easy", yr: 2019, cat: "UFC Numbered PPVs" },
      { q: "Who knocked out Jose Aldo in 13 seconds to win the featherweight title at UFC 194?", opts: ["Conor McGregor", "Max Holloway", "Chad Mendes", "Frankie Edgar"], a: "Conor McGregor", exp: "Conor McGregor landed a counter left hook 13 seconds into the 1st round in Las Vegas.", diff: "Easy", yr: 2015, cat: "UFC Numbered PPVs" },
      { q: "Who scored a dramatic knockout at 4:59 of round 5 to win the BMF title at UFC 300?", opts: ["Max Holloway", "Justin Gaethje", "Dustin Poirier", "Charles Oliveira"], a: "Max Holloway", exp: "Max Holloway pointed to the center and knocked out Justin Gaethje with one second remaining.", diff: "Easy", yr: 2024, cat: "UFC Numbered PPVs" },
      { q: "How many consecutive successful UFC title defenses did Demetrious Johnson achieve to set the all-time UFC record?", opts: ["11 defenses", "10 defenses", "12 defenses", "9 defenses"], a: "11 defenses", exp: "Demetrious 'Mighty Mouse' Johnson defended the flyweight title 11 consecutive times between 2012 and 2017.", diff: "Medium", yr: 2017, cat: "UFC World Championship Fights" },
      { q: "Which inaugural The Ultimate Fighter (TUF 1) Finale bout in 2005 was inducted into the UFC Hall of Fame Fight Wing for saving the company?", opts: ["Forrest Griffin vs Stephan Bonnar", "Diego Sanchez vs Kenny Florian", "Chuck Liddell vs Randy Couture", "Matt Hughes vs Frank Trigg"], a: "Forrest Griffin vs Stephan Bonnar", exp: "Griffin vs Bonnar 1 in April 2005 delivered an unforgettable war that catapulted UFC into mainstream success.", diff: "Medium", yr: 2005, cat: "UFC Hall of Fame & Legends" },
      { q: "Who landed a UFC record 445 significant strikes against Calvin Kattar in a Fight Island Fight Night main event in 2021?", opts: ["Max Holloway", "Nate Diaz", "Alexander Volkanovski", "Dustin Poirier"], a: "Max Holloway", exp: "Max Holloway set the all-time single-fight significant strike record in January 2021.", diff: "Hard", yr: 2021, cat: "UFC Fight Night & Title Eliminators" },
    ],
  };

  const pool: RawGeneratedQuestion[] = [];
  const isTournamentSpecific = Boolean(
    targetCategory &&
    !targetCategory.startsWith("All") &&
    targetCategory !== "All Tournaments" &&
    targetCategory !== "All Events" &&
    targetCategory !== "All Grand Prix"
  );

  for (const s of sports) {
    const list = factsBank[s] || factsBank["Cricket"];
    for (const item of list) {
      if (isTournamentSpecific && item.cat !== targetCategory) continue;
      if (targetDiff !== "Mixed" && item.diff !== targetDiff) continue;
      pool.push({
        sport: s,
        difficulty: item.diff,
        category: item.cat,
        year: item.yr,
        question: item.q,
        options: [...item.opts],
        answer: item.a,
        explanation: item.exp,
        source: "Arena Sports Verified Archives",
      });
    }
  }

  // If strict difficulty match had insufficient items, relax difficulty while maintaining strict sport & tournament
  if (pool.length < count) {
    for (const s of sports) {
      const list = factsBank[s] || factsBank["Cricket"];
      for (const item of list) {
        if (isTournamentSpecific && item.cat !== targetCategory) continue;
        if (pool.some((p) => p.question === item.q)) continue;
        pool.push({
          sport: s,
          difficulty: item.diff,
          category: item.cat,
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

  // If still empty (e.g. rare combination), use the sport's full pool
  if (pool.length === 0) {
    for (const s of sports) {
      const list = factsBank[s] || factsBank["Cricket"];
      for (const item of list) {
        pool.push({
          sport: s,
          difficulty: item.diff,
          category: item.cat,
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
 * Execute single batch generation via configured providers with automatic mutual failover.
 */
async function generateSingleBatch(options: GenerateOptions): Promise<RawGeneratedQuestion[]> {
  const mode = options.mode || "classic";
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const geminiModel = process.env.AI_MODEL || "gemini-2.5-flash";

  // 1. 1v1 Multiplayer & 60s Sprint -> Try Groq first (high speed), failover to Gemini
  if (mode === "multiplayer" || mode === "sprint") {
    if (groqKey) {
      try {
        return await generateViaOpenAICompatible(options, "https://api.groq.com/openai/v1", groqKey, groqModel);
      } catch (err) {
        console.warn(`[AI Generator - Groq for ${mode}]: ${err instanceof Error ? err.message : String(err)}. Engaging Gemini backup.`);
      }
    }

    if (xaiKey && xaiKey !== groqKey) {
      try {
        const model = process.env.XAI_MODEL || "grok-beta";
        return await generateViaOpenAICompatible(options, "https://api.x.ai/v1", xaiKey, model);
      } catch (err) {
        console.warn(`[AI Generator - xAI for ${mode}]: ${err instanceof Error ? err.message : String(err)}.`);
      }
    }

    if (geminiKey) {
      try {
        return await generateViaGemini(options, geminiKey, geminiModel);
      } catch (err) {
        console.warn(`[AI Generator - Gemini Backup for ${mode}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 2. Classic & Challenge Modes -> Try Google Gemini first, failover to Groq
  if (mode === "classic" || mode === "challenge" || !mode) {
    if (geminiKey) {
      try {
        return await generateViaGemini(options, geminiKey, geminiModel);
      } catch (err) {
        console.warn(`[AI Generator - Gemini for ${mode}]: ${err instanceof Error ? err.message : String(err)}. Engaging Groq backup.`);
      }
    }

    if (groqKey) {
      try {
        return await generateViaOpenAICompatible(options, "https://api.groq.com/openai/v1", groqKey, groqModel);
      } catch (err) {
        console.warn(`[AI Generator - Groq Backup for ${mode}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 3. Resilient fallback strictly 1975-2026 if all external providers are offline
  return generateFallbackQuestions(options);
}

/**
 * Main Question Generation Service.
 * Automatically chunks large requests (>10 questions) into parallel batches to prevent token limits and timeouts.
 */
export async function generateAIQuestions(options: GenerateOptions): Promise<RawGeneratedQuestion[]> {
  const totalCount = options.count;

  // For counts > 10, batch into chunks of max 10 to ensure rapid responses (<3s) and zero token truncations
  if (totalCount > 10) {
    const chunks: number[] = [];
    let remaining = totalCount;
    while (remaining > 0) {
      const take = Math.min(remaining, 10);
      chunks.push(take);
      remaining -= take;
    }

    const chunkPromises = chunks.map(async (chunkSize, i) => {
      return await generateSingleBatch({
        ...options,
        count: chunkSize,
        excludeStems: [
          ...(options.excludeStems || []),
          `batch-entropy-${i}-${Date.now()}`,
        ],
      });
    });

    const batchResults = await Promise.all(chunkPromises);
    const combined = batchResults.flat();
    return combined.slice(0, totalCount);
  }

  return await generateSingleBatch(options);
}
