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
- Target: Casual fans. Test famous champions, iconic record holders, legendary milestones (e.g., Messi 2022 World Cup, Undertaker WrestleMania streak, Usain Bolt, Hamilton 7 titles, Jordan Bulls 6 rings).
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

  const categoryInstruction = category && category !== "All" && category !== "All Tournaments" && category !== "All Events" && category !== "All Grand Prix"
    ? `STRICT TOURNAMENT/LEAGUE FOCUS:
Every question MUST strictly and exclusively focus on: "${category}".
All questions, correct answers, and plausible distractors MUST directly reference matches, champions, moments, or records from "${category}".
Set the "category" property of each question to "${category}".`
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
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  cleaned = cleaned.trim();

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("AI response was not a JSON array.");
  }
  return parsed as RawGeneratedQuestion[];
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
        temperature: 0.7,
        topP: 0.95,
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
 * Generate questions via Groq / xAI / OpenAI-compatible REST API (Primary for 1v1 & 60s Blitz modes)
 */
async function generateViaOpenAICompatible(
  options: GenerateOptions,
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<RawGeneratedQuestion[]> {
  const prompt = buildPrompt(options);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are an expert sports trivia engine. You output ONLY valid JSON arrays containing sports trivia question objects. Never include markdown code fences or conversational text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.65,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned empty content.");
  }

  try {
    return parseAIJsonResponse(content);
  } catch {
    const parsedObj = JSON.parse(content);
    const possibleArray = Object.values(parsedObj).find((v) => Array.isArray(v));
    if (Array.isArray(possibleArray)) {
      return possibleArray as RawGeneratedQuestion[];
    }
    throw new Error("Could not find question array in JSON object.");
  }
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
      { q: "Who captained India to their historic victory in the inaugural 2007 ICC World Twenty20?", opts: ["MS Dhoni", "Rahul Dravid", "Sourav Ganguly", "Yuvraj Singh"], a: "MS Dhoni", exp: "MS Dhoni led India to defeat Pakistan in the Johannesburg final in 2007.", diff: "Easy", yr: 2007 },
      { q: "Who holds the record for the highest individual score in Test match cricket with 400 not out?", opts: ["Brian Lara", "Matthew Hayden", "Don Bradman", "Virender Sehwag"], a: "Brian Lara", exp: "Brian Lara scored 400* against England in Antigua in 2004.", diff: "Easy", yr: 2004 },
      { q: "Which team won the 2019 ICC Men's Cricket World Cup final at Lord's on boundary countback?", opts: ["England", "New Zealand", "Australia", "India"], a: "England", exp: "England won following a tied match and tied Super Over against New Zealand.", diff: "Medium", yr: 2019 },
      { q: "Which nation won the inaugural ICC Men's Cricket World Cup held in England in 1975?", opts: ["West Indies", "Australia", "England", "Pakistan"], a: "West Indies", exp: "Clive Lloyd led the West Indies to victory over Australia in the 1975 final at Lord's.", diff: "Medium", yr: 1975 },
      { q: "Who was the Man of the Match in the 1999 ICC Men's Cricket World Cup Final at Lord's?", opts: ["Shane Warne", "Glenn McGrath", "Adam Gilchrist", "Steve Waugh"], a: "Shane Warne", exp: "Shane Warne took 4 for 33 as Australia bowled Pakistan out for 132 in 1999.", diff: "Hard", yr: 1999 },
      { q: "Who was the only bowler to take 4 wickets in 4 consecutive balls in a Men's Cricket World Cup match?", opts: ["Lasith Malinga", "Wasim Akram", "Chaminda Vaas", "Brett Lee"], a: "Lasith Malinga", exp: "Lasith Malinga took 4 in 4 against South Africa in the 2007 World Cup in Guyana.", diff: "Legendary", yr: 2007 },
      { q: "Against which team and at which venue did Sachin Tendulkar score his 100th international century in 2012?", opts: ["Bangladesh at Mirpur", "Sri Lanka at Colombo", "England at The Oval", "Australia at Sydney"], a: "Bangladesh at Mirpur", exp: "Tendulkar achieved his historic 100th international century in 2012 against Bangladesh at Sher-e-Bangla Stadium.", diff: "Legendary", yr: 2012 },
    ],
    Football: [
      { q: "Which national team won the 2022 FIFA World Cup in Qatar?", opts: ["Argentina", "France", "Croatia", "Morocco"], a: "Argentina", exp: "Argentina defeated France 4-2 on penalties following an epic 3-3 draw.", diff: "Easy", yr: 2022 },
      { q: "Who is the all-time leading goalscorer in UEFA Champions League history?", opts: ["Cristiano Ronaldo", "Lionel Messi", "Robert Lewandowski", "Karim Benzema"], a: "Cristiano Ronaldo", exp: "Cristiano Ronaldo has scored 140 goals in the UEFA Champions League.", diff: "Easy", yr: 2023 },
      { q: "Which club completed an entire 38-game Premier League season undefeated in 2003-04?", opts: ["Arsenal", "Manchester United", "Chelsea", "Liverpool"], a: "Arsenal", exp: "Arsène Wenger's Arsenal 'Invincibles' went unbeaten throughout the 2003-04 league campaign.", diff: "Easy", yr: 2004 },
      { q: "Which country won the UEFA Euro 2004 tournament in one of the biggest upsets in football history?", opts: ["Greece", "Portugal", "Czech Republic", "Netherlands"], a: "Greece", exp: "Greece defeated tournament hosts Portugal 1-0 in Lisbon to win Euro 2004.", diff: "Medium", yr: 2004 },
      { q: "Who won the Ballon d'Or in 2018, snapping a 10-year duopoly by Messi and Ronaldo?", opts: ["Luka Modrić", "Antoine Griezmann", "Kylian Mbappé", "Mohamed Salah"], a: "Luka Modrić", exp: "Luka Modrić won after winning the Champions League and leading Croatia to the World Cup final.", diff: "Medium", yr: 2018 },
      { q: "Which referee officiated the 2010 FIFA World Cup Final between Spain and the Netherlands, issuing 14 yellow cards?", opts: ["Howard Webb", "Pierluigi Collina", "Nicola Rizzoli", "Mark Clattenburg"], a: "Howard Webb", exp: "English referee Howard Webb officiated the fiery 2010 final in Johannesburg.", diff: "Hard", yr: 2010 },
      { q: "Who scored the winning golden goal for France in the 103rd minute of the UEFA Euro 2000 final against Italy?", opts: ["David Trezeguet", "Sylvain Wiltord", "Zinedine Zidane", "Thierry Henry"], a: "David Trezeguet", exp: "David Trezeguet struck the volley in extra time in Rotterdam.", diff: "Hard", yr: 2000 },
      { q: "Who is the only player to score hat-tricks in the Premier League, Champions League, and FA Cup in the 2009-10 season?", opts: ["Yossi Benayoun", "Fernando Torres", "Didier Drogba", "Wayne Rooney"], a: "Yossi Benayoun", exp: "Yossi Benayoun achieved this rare treble of hat-tricks for Liverpool in 2009-10.", diff: "Legendary", yr: 2010 },
    ],
    Basketball: [
      { q: "Who became the NBA's all-time leading regular season scorer in February 2023, surpassing Kareem Abdul-Jabbar?", opts: ["LeBron James", "Michael Jordan", "Kobe Bryant", "Karl Malone"], a: "LeBron James", exp: "LeBron James passed Kareem's 38,387 career points in February 2023.", diff: "Easy", yr: 2023 },
      { q: "Which NBA franchise won 73 regular-season games in 2015-16, setting the all-time single-season record?", opts: ["Golden State Warriors", "Chicago Bulls", "San Antonio Spurs", "Miami Heat"], a: "Golden State Warriors", exp: "The Golden State Warriors finished the 2015-16 regular season with a 73-9 record.", diff: "Easy", yr: 2016 },
      { q: "Which country defeated Team USA in the semi-finals of men's basketball at the 2004 Athens Olympics?", opts: ["Argentina", "Lithuania", "Spain", "Italy"], a: "Argentina", exp: "Manu Ginobili led Argentina to an 89-81 victory on their way to Olympic Gold.", diff: "Medium", yr: 2004 },
      { q: "Which player scored 8 points in 9 seconds to lead the Indiana Pacers to a shock playoff win over the Knicks in 1995?", opts: ["Reggie Miller", "Rik Smits", "Mark Jackson", "Dale Davis"], a: "Reggie Miller", exp: "Reggie Miller hit two 3-pointers and two free throws in 8.9 seconds at Madison Square Garden.", diff: "Hard", yr: 1995 },
      { q: "Which team originally drafted Dirk Nowitzki with the 9th overall pick in 1998 before trading him to Dallas?", opts: ["Milwaukee Bucks", "Boston Celtics", "Denver Nuggets", "Golden State Warriors"], a: "Milwaukee Bucks", exp: "The Bucks drafted Dirk Nowitzki in 1998 and traded him to Dallas for Robert Traylor.", diff: "Legendary", yr: 1998 },
      { q: "Who won the NBA Finals MVP in 2004 when the Detroit Pistons upset the Los Angeles Lakers 4-1?", opts: ["Chauncey Billups", "Ben Wallace", "Rip Hamilton", "Rasheed Wallace"], a: "Chauncey Billups", exp: "Chauncey Billups averaged 21 points and 5.2 assists to claim the 2004 Finals MVP.", diff: "Hard", yr: 2004 },
    ],
    "Formula 1": [
      { q: "Which driver holds the record for most race victories in a single Formula 1 season (19 wins in 2023)?", opts: ["Max Verstappen", "Lewis Hamilton", "Michael Schumacher", "Sebastian Vettel"], a: "Max Verstappen", exp: "Max Verstappen won 19 of 22 Grands Prix in a dominant 2023 campaign.", diff: "Easy", yr: 2023 },
      { q: "Which team won both the Drivers' and Constructors' Championships in 2009 in their only season of existence?", opts: ["Brawn GP", "Red Bull Racing", "Toyota Racing", "BMW Sauber"], a: "Brawn GP", exp: "Ross Brawn's team won both titles with Jenson Button in 2009 before becoming Mercedes.", diff: "Medium", yr: 2009 },
      { q: "Who won the wet 2008 Italian Grand Prix at Monza for Toro Rosso, becoming the youngest race winner at the time?", opts: ["Sebastian Vettel", "Lewis Hamilton", "Fernando Alonso", "Robert Kubica"], a: "Sebastian Vettel", exp: "21-year-old Sebastian Vettel scored an incredible wet-weather maiden victory.", diff: "Hard", yr: 2008 },
      { q: "Who was the last driver to win the Formula 1 World Drivers' Championship driving for Scuderia Ferrari?", opts: ["Kimi Räikkönen", "Felipe Massa", "Fernando Alonso", "Sebastian Vettel"], a: "Kimi Räikkönen", exp: "Kimi Räikkönen won the 2007 title for Ferrari by a single point over Hamilton and Alonso.", diff: "Legendary", yr: 2007 },
      { q: "At which British circuit did Ayrton Senna produce his iconic wet-weather opening lap overtaking 4 cars in 1993?", opts: ["Donington Park", "Silverstone", "Brands Hatch", "Aintree"], a: "Donington Park", exp: "Senna's legendary 'Lap of the Gods' occurred at the 1993 European Grand Prix at Donington.", diff: "Legendary", yr: 1993 },
    ],
    "WWE/WWF": [
      { q: "Who famously ended The Undertaker's 21-0 WrestleMania undefeated streak at WrestleMania XXX in 2014?", opts: ["Brock Lesnar", "Roman Reigns", "John Cena", "Triple H"], a: "Brock Lesnar", exp: "Brock Lesnar defeated The Undertaker at WrestleMania XXX in New Orleans, shocking the wrestling world.", diff: "Easy", yr: 2014 },
      { q: "Which WWE superstar won back-to-back Royal Rumble matches in 1997 and 1998 during the start of the Attitude Era?", opts: ["Stone Cold Steve Austin", "The Rock", "Shawn Michaels", "Mankind"], a: "Stone Cold Steve Austin", exp: "Stone Cold Steve Austin won the Royal Rumble in 1997, 1998, and later 2001 (a record 3 wins).", diff: "Easy", yr: 1998 },
      { q: "Which iconic match featured Mankind being thrown off the top of the Hell in a Cell structure by The Undertaker?", opts: ["King of the Ring 1998", "WrestleMania XIV", "SummerSlam 1998", "Royal Rumble 1999"], a: "King of the Ring 1998", exp: "Mick Foley fell through the announce table at King of the Ring in Pittsburgh in June 1998.", diff: "Medium", yr: 1998 },
      { q: "Who defeated Shawn Michaels in a Career vs Streak match at WrestleMania XXVI in 2010, forcing Michaels into retirement?", opts: ["The Undertaker", "Triple H", "John Cena", "Batista"], a: "The Undertaker", exp: "The Undertaker defeated Shawn Michaels in Arizona to end HBK's in-ring career.", diff: "Medium", yr: 2010 },
      { q: "At which WrestleMania did 'Stone Cold' Steve Austin face The Rock in their historic trilogy finale in 2003?", opts: ["WrestleMania XIX", "WrestleMania X-Seven", "WrestleMania XV", "WrestleMania XX"], a: "WrestleMania XIX", exp: "The Rock defeated Austin at WrestleMania XIX in Seattle in Austin's final match for 19 years.", diff: "Hard", yr: 2003 },
      { q: "Who was the longest-reigning modern WWE Champion of the 21st century, holding the Universal Title for 1,316 days?", opts: ["Roman Reigns", "Brock Lesnar", "CM Punk", "John Cena"], a: "Roman Reigns", exp: "Roman Reigns held the championship from Payback 2020 until WrestleMania XL in April 2024.", diff: "Hard", yr: 2024 },
      { q: "Who won the first-ever Men's Royal Rumble match held in Hamilton, Ontario in January 1988?", opts: ["'Hacksaw' Jim Duggan", "One Man Gang", "Bret Hart", "Don Muraco"], a: "'Hacksaw' Jim Duggan", exp: "Jim Duggan eliminated One Man Gang to win the inaugural 20-man Royal Rumble in 1988.", diff: "Legendary", yr: 1988 },
    ],
    UFC: [
      { q: "Who holds the record for the fastest knockout in UFC history, finishing Ben Askren in just 5 seconds in 2019?", opts: ["Jorge Masvidal", "Conor McGregor", "Duane Ludwig", "Francis Ngannou"], a: "Jorge Masvidal", exp: "Jorge Masvidal landed a flying knee at UFC 239 in July 2019 to score a 5-second knockout.", diff: "Easy", yr: 2019 },
      { q: "Which UFC fighter became the first simultaneous two-division champion by knocking out Eddie Alvarez at UFC 205 in 2016?", opts: ["Conor McGregor", "Daniel Cormier", "Henry Cejudo", "Amanda Nunes"], a: "Conor McGregor", exp: "Conor McGregor captured the Lightweight title at Madison Square Garden to hold both 145 and 155 belts.", diff: "Easy", yr: 2016 },
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

