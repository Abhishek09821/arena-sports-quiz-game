import json, re, random
from collections import Counter, defaultdict

random.seed(42)

# Load data/questions.json
with open('data/questions.json') as f:
    current_qs = json.load(f)

# Load clean_dict
with open('/Users/abhishektiwari/.gemini/antigravity-ide/brain/acdf880d-988f-4056-82ed-949b6f44c887/scratch/clean_existing.json') as f:
    clean_dict = json.load(f)

import sys
sys.path.append('/Users/abhishektiwari/.gemini/antigravity-ide/brain/acdf880d-988f-4056-82ed-949b6f44c887/scratch')
import finalize_facts, top_up_facts, generate_extra_bulk, expand_to_525

bad_kw = [
    'mental habit', 'sports science', 'spectator applause', 'rainy weather',
    'duel between captains', 'powerhouse in', 'scoring rules', 'standardizes equipment',
    'standardizes anti-doping', 'standardizes video assistant', 'standardizes fair play',
    'what fundamental rule dictates legal scoring', 'benchmark historical achievement in',
    'unanimous agreement from both captains', 'ignoring early fatigue signals completely',
    'total panic and abandoning all strategies', 'celebratory bingeing between games',
    'social media fan votes'
]

def is_valid_question(q):
    t = (q['question'] + ' ' + ' '.join(q['options'])).lower()
    if any(b in t for b in bad_kw):
        return False
    if len(set(q['options'])) != 4:
        return False
    return True

def extract_fact_stem(q):
    t = q['question'].lower()
    t = re.sub(r'which [^:]*is (famously honored|associated|universally renowned|celebrated|recognized)[^:]*:\s*', '', t)
    t = re.sub(r'during the [^:]*acclaim for:\s*', '', t)
    t = re.sub(r'who won [^:]*:\s*', '', t)
    t = re.sub(r'in [a-z0-9\s]+, which [^:]*is (celebrated|associated|recognized|honored)[^:]*:\s*', '', t)
    t = re.sub(r'[^a-z0-9]', '', t)
    return t[:50]

unique_map = {}

for q in current_qs:
    if is_valid_question(q):
        stem = extract_fact_stem(q)
        ans_text = q['options'][q['answer']].strip().lower()
        key = (q['sport'], stem, ans_text)
        if key not in unique_map:
            unique_map[key] = q

def add_scratch_row(sport, row, source_tag):
    year, diff, q_text, correct, distractors, expl = row
    if len(distractors) < 3:
        return
    dists = distractors[:3]
    opts = [correct] + dists
    if len(set(opts)) != 4:
        return
    t = (q_text + ' ' + ' '.join(opts)).lower()
    if any(b in t for b in bad_kw):
        return
    q_obj = {
        'id': f'{sport[:2].lower()}-{source_tag}-{len(unique_map)}',
        'sport': sport,
        'year': year,
        'difficulty': diff,
        'question': q_text,
        'options': opts,
        'answer': 0,
        'explanation': expl
    }
    stem = extract_fact_stem(q_obj)
    key = (sport, stem, correct.strip().lower())
    if key not in unique_map:
        unique_map[key] = q_obj

for sport, items in clean_dict.items():
    for q in items:
        if is_valid_question(q):
            stem = extract_fact_stem(q)
            ans_text = q['options'][q['answer']].strip().lower()
            key = (sport, stem, ans_text)
            if key not in unique_map:
                unique_map[key] = q

mapping = {
    'CRICKET_EXTRA': 'Cricket', 'FOOTBALL_EXTRA': 'Football', 'BASKETBALL_EXTRA': 'Basketball',
    'TENNIS_EXTRA': 'Tennis', 'F1_EXTRA': 'Formula 1', 'BADMINTON_EXTRA': 'Badminton',
    'HOCKEY_EXTRA': 'Hockey', 'ATHLETICS_EXTRA': 'Athletics'
}
for var, sp in mapping.items():
    if hasattr(finalize_facts, var):
        for row in getattr(finalize_facts, var):
            add_scratch_row(sp, row, 'fin')

for sp, rows in top_up_facts.TOP_UP_DATA.items():
    for row in rows:
        add_scratch_row(sp, row, 'top')

bulk_map = {
    'f1_extra_facts': 'Formula 1', 'badminton_extra_facts': 'Badminton',
    'hockey_extra_facts': 'Hockey', 'athletics_extra_facts': 'Athletics'
}
for list_name, sp in bulk_map.items():
    if hasattr(generate_extra_bulk, list_name):
        for row in getattr(generate_extra_bulk, list_name):
            add_scratch_row(sp, row, 'blk')

for list_name, sp in [('badminton_extra', 'Badminton'), ('hockey_extra', 'Hockey')]:
    if hasattr(expand_to_525, list_name):
        for row in getattr(expand_to_525, list_name):
            add_scratch_row(sp, row, 'exp')

all_raw = list(unique_map.values())

# Distractor Enhancer Pools
WTA_CHAMPS = [
    "Serena Williams", "Venus Williams", "Maria Sharapova", "Justine Henin",
    "Kim Clijsters", "Amelie Mauresmo", "Lindsay Davenport", "Victoria Azarenka",
    "Angelique Kerber", "Petra Kvitova", "Simona Halep", "Iga Swiatek",
    "Aryna Sabalenka", "Elena Rybakina", "Coco Gauff", "Ashleigh Barty"
]
WTA_NAMES_SET = {
    'sania mirza', 'martina hingis', 'arantxa sanchez vicario', 'conchita martinez',
    'mary pierce', 'anastasia myskina', 'svetlana kuznetsova', 'elena dementieva',
    'dinara safina', 'jelena jankovic', 'ana ivanovic', 'caroline wozniacki', 'li na',
    'ashleigh barty', 'garbine muguruza', 'naomi osaka', 'samantha stosur',
    'francesca schiavone', 'marion bartoli', 'flavia pennetta', 'angelique kerber',
    'sloane stephens', 'bianca andreescu', 'sofia kenin', 'emma raducanu',
    'elena rybakina', 'marketa vondrousova', 'aryna sabalenka', 'iga swiatek', 'coco gauff'
}

TENNIS_DOUBLES = [
    "Bob and Mike Bryan", "Todd Woodbridge and Mark Woodforde", "Daniel Nestor",
    "Leander Paes", "Mahesh Bhupathi", "Rohan Bopanna", "Jamie Murray",
    "Marcelo Melo", "Mate Pavic", "Nikola Mektic", "Nicolas Mahut and Pierre-Hugues Herbert"
]
TENNIS_DOUBLES_SET = {
    'bob and mike bryan', 'todd woodbridge and mark woodforde', 'daniel nestor',
    'leander paes', 'mahesh bhupathi', 'rohan bopanna', 'jamie murray',
    'marcelo melo', 'mate pavic', 'nikola mektic', 'nicolas mahut', 'pierre-hugues herbert'
}

ATP_CONTEMPORARY = [
    "Alex de Minaur", "Felix Auger-Aliassime", "Denis Shapovalov", "Cameron Norrie",
    "Casper Ruud", "Andrey Rublev", "Grigor Dimitrov", "Taylor Fritz",
    "Frances Tiafoe", "Tommy Paul", "Sebastian Korda", "Karen Khachanov", "Hubert Hurkacz"
]

ATHLETICS_HIGH_JUMP = ["Mutaz Barshim", "Gianmarco Tamberi", "Stefan Holm", "Bohdan Bondarenko", "Derek Drouin", "Javier Sotomayor"]
ATHLETICS_POLE_VAULT = ["Armand 'Mondo' Duplantis", "Sergey Bubka", "Renaud Lavillenie", "Sam Kendricks", "Thiago Braz", "Piotr Lisek"]
ATHLETICS_JAVELIN = ["Jan Zelezny", "Neeraj Chopra", "Johannes Vetter", "Thomas Rohler", "Arshad Nadeem", "Jakub Vadlejch", "Anderson Peters"]
ATHLETICS_JUMPERS = ["Jonathan Edwards", "Mike Powell", "Christian Taylor", "Pedro Pichardo", "Will Claye", "Bob Beamon", "Carl Lewis", "Dwight Phillips", "Miltiadis Tentoglou"]
ATHLETICS_HURDLES = ["Karsten Warholm", "Rai Benjamin", "Alison dos Santos", "Edwin Moses", "Kevin Young", "Grant Holloway", "Aries Merritt"]
ATHLETICS_WOMEN = ["Sydney McLaughlin-Levrone", "Faith Kipyegon", "Shelly-Ann Fraser-Pryce", "Elaine Thompson-Herah", "Sifan Hassan", "Femke Bol", "Sha'Carri Richardson", "Shericka Jackson", "Florence Griffith-Joyner"]
ATHLETICS_WOMEN_SET = {
    'sydney mclaughlin-levrone', 'faith kipyegon', 'shelly-ann fraser-pryce',
    'elaine thompson-herah', 'sifan hassan', 'femke bol', 'sha\'carri richardson',
    'shericka jackson', 'florence griffith-joyner', 'allyson felix', 'carmelita jeter'
}
ATHLETICS_DISTANCE = ["Eliud Kipchoge", "Kelvin Kiptum", "Kenenisa Bekele", "Haile Gebrselassie", "Mo Farah", "Joshua Cheptegei", "Jacob Kiplimo"]
ATHLETICS_SPRINTS = ["Usain Bolt", "Tyson Gay", "Yohan Blake", "Asafa Powell", "Justin Gatlin", "Noah Lyles", "Christian Coleman", "Donovan Bailey", "Maurice Greene", "Linford Christie"]

NBA_GUARDS_WINGS = ["Malcolm Brogdon", "CJ McCollum", "Tyrese Haliburton", "Tyler Herro", "Jordan Poole", "Jrue Holiday", "De'Aaron Fox", "Desmond Bane", "Derrick White", "Fred VanVleet", "Mikal Bridges", "Jalen Brunson"]
NBA_CENTERS = ["Nikola Jokic", "Joel Embiid", "Bam Adebayo", "Rudy Gobert", "Anthony Davis", "Karl-Anthony Towns", "Domantas Sabonis", "Brook Lopez", "Myles Turner"]

F1_MODERN = ["Charles Leclerc", "Carlos Sainz", "Lando Norris", "George Russell", "Sergio Perez", "Oscar Piastri", "Pierre Gasly", "Esteban Ocon", "Alex Albon", "Fernando Alonso"]
F1_MODERN_SET = {
    'lando norris', 'oscar piastri', 'charles leclerc', 'carlos sainz', 'george russell',
    'pierre gasly', 'esteban ocon', 'alex albon', 'yuki tsunoda', 'sergio perez',
    'lance stroll', 'valtteri bottas', 'guanyu zhou', 'kevin magnussen', 'nico hulkenberg'
}

BADMINTON_WOMEN = ["Carolina Marin", "PV Sindhu", "Saina Nehwal", "Tai Tzu-ying", "Akane Yamaguchi", "Nozomi Okuhara", "An Se-young", "Ratchanok Intanon", "Chen Yufei", "Li Xuerui"]
BADMINTON_WOMEN_SET = {
    'carolina marin', 'pv sindhu', 'saina nehwal', 'tai tzu-ying', 'akane yamaguchi',
    'nozomi okuhara', 'an se-young', 'ratchanok intanon', 'chen yufei', 'li xuerui', 'wang yihan', 'susi susanti'
}

enhanced_questions = []
sport_counters = defaultdict(int)
sport_prefixes = {
    'Athletics': 'ath',
    'Badminton': 'bd',
    'Basketball': 'bb',
    'Cricket': 'cri',
    'Football': 'fb',
    'Formula 1': 'f1',
    'Hockey': 'ho',
    'Tennis': 'ten'
}

for q in all_raw:
    correct_ans = q['options'][q['answer']]
    correct_norm = correct_ans.strip().lower()
    sport = q['sport']
    q_text = q['question'].lower()
    opts = [o for o in q['options'] if o != correct_ans]
    new_dists = None

    if sport == 'Tennis' and (correct_norm in WTA_NAMES_SET or 'women' in q_text or 'sister' in q_text or 'female' in q_text):
        new_dists = [p for p in WTA_CHAMPS if p.lower() != correct_norm][:3]
    elif sport == 'Tennis' and (correct_norm in TENNIS_DOUBLES_SET or 'doubles' in q_text):
        new_dists = [p for p in TENNIS_DOUBLES if p.lower() != correct_norm][:3]
    elif sport == 'Tennis' and {'Roger Federer', 'Rafael Nadal', 'Novak Djokovic'}.issubset(set(q['options'])):
        new_dists = [p for p in ATP_CONTEMPORARY if p.lower() != correct_norm][:3]
    elif sport == 'Athletics' and ('high jump' in q_text or correct_norm in {'javier sotomayor', 'mutaz barshim', 'gianmarco tamberi', 'stefan holm'}):
        new_dists = [p for p in ATHLETICS_HIGH_JUMP if p.lower() != correct_norm][:3]
    elif sport == 'Athletics' and ('pole vault' in q_text or correct_norm in {"armand 'mondo' duplantis", 'sergey bubka', 'renaud lavillenie', 'sam kendricks'}):
        new_dists = [p for p in ATHLETICS_POLE_VAULT if p.lower() != correct_norm][:3]
    elif sport == 'Athletics' and ('javelin' in q_text or correct_norm in {'jan zelezny', 'neeraj chopra', 'johannes vetter', 'thomas rohler', 'arshad nadeem', 'jakub vadlejch'}):
        new_dists = [p for p in ATHLETICS_JAVELIN if p.lower() != correct_norm][:3]
    elif sport == 'Athletics' and ('long jump' in q_text or 'triple jump' in q_text or correct_norm in {'jonathan edwards', 'mike powell', 'christian taylor', 'pedro pichardo', 'bob beamon'}):
        new_dists = [p for p in ATHLETICS_JUMPERS if p.lower() != correct_norm][:3]
    elif sport == 'Athletics' and ('hurdles' in q_text or correct_norm in {'karsten warholm', 'rai benjamin', 'alison dos santos', 'edwin moses', 'kevin young'}):
        new_dists = [p for p in ATHLETICS_HURDLES if p.lower() != correct_norm][:3]
    elif sport == 'Athletics' and (correct_norm in ATHLETICS_WOMEN_SET or 'women' in q_text or 'female' in q_text):
        new_dists = [p for p in ATHLETICS_WOMEN if p.lower() != correct_norm][:3]
    elif sport == 'Athletics' and ('marathon' in q_text or '5,000m' in q_text or '10,000m' in q_text or correct_norm in {'eliud kipchoge', 'kelvin kiptum', 'kenenisa bekele', 'haile gebrselassie', 'mo farah'}):
        new_dists = [p for p in ATHLETICS_DISTANCE if p.lower() != correct_norm][:3]
    elif sport == 'Athletics' and {'Usain Bolt', 'Carl Lewis', 'Eliud Kipchoge'}.issubset(set(q['options'])):
        new_dists = [p for p in ATHLETICS_SPRINTS if p.lower() != correct_norm][:3]
    elif sport == 'Basketball' and ('center' in q_text or 'rebound' in q_text or correct_norm in {'nikola jokic', 'joel embiid', 'bam adebayo', 'rudy gobert'}):
        new_dists = [p for p in NBA_CENTERS if p.lower() != correct_norm][:3]
    elif sport == 'Basketball' and (correct_norm in {'fred vanvleet', 'mikal bridges', 'michael porter jr', 'derrick white', 'austin reaves', 'jalen brunson'} or {'Kobe Bryant', 'Michael Jordan', 'LeBron James'}.issubset(set(q['options']))):
        new_dists = [p for p in NBA_GUARDS_WINGS if p.lower() != correct_norm][:3]
    elif sport == 'Formula 1' and (correct_norm in F1_MODERN_SET or {'Michael Schumacher', 'Max Verstappen', 'Lewis Hamilton'}.issubset(set(q['options']))):
        new_dists = [p for p in F1_MODERN if p.lower() != correct_norm][:3]
    elif sport == 'Badminton' and (correct_norm in BADMINTON_WOMEN_SET or 'women' in q_text or 'female' in q_text):
        new_dists = [p for p in BADMINTON_WOMEN if p.lower() != correct_norm][:3]

    if new_dists and len(new_dists) >= 3:
        all_opts = [correct_ans] + new_dists[:3]
    else:
        all_opts = [correct_ans] + opts[:3]

    if len(set(all_opts)) != 4:
        continue

    random.shuffle(all_opts)
    sport_counters[sport] += 1
    prefix = sport_prefixes.get(sport, sport[:2].lower())
    clean_id = f'{prefix}-{sport_counters[sport]:04d}'

    clean_q = {
        'id': clean_id,
        'sport': sport,
        'year': q.get('year', 2020),
        'difficulty': q.get('difficulty', 'Medium'),
        'question': q['question'],
        'options': all_opts,
        'answer': all_opts.index(correct_ans),
        'explanation': q.get('explanation', f'{correct_ans} is the correct answer.')
    }
    enhanced_questions.append(clean_q)

enhanced_questions.sort(key=lambda x: (x['sport'], x['id']))

print(f'Total final curated questions: {len(enhanced_questions)}')
counts = Counter(q['sport'] for q in enhanced_questions)
for s, c in counts.items():
    print(f'  {s}: {c}')

with open('data/questions.json', 'w') as f:
    json.dump(enhanced_questions, f, indent=2)

print('Successfully written curated questions to data/questions.json!')
