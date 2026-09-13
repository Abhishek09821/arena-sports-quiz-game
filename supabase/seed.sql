-- ═══════════════════════════════════════════════════════════════
-- ARENA — Development Seed Data
-- All facts are verifiable from official sports records.
-- ═══════════════════════════════════════════════════════════════

-- Cricket
INSERT INTO public.questions (sport, difficulty, year, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source_name, verification_status, question_hash, active)
VALUES
('Cricket', 'Easy', 1992, 'Which country won the 1992 Cricket World Cup?', 'Australia', 'Pakistan', 'England', 'South Africa', 1, 'Pakistan defeated England in the final in Melbourne.', 'ICC World Cup records', 'verified', md5('cricket-1992-world-cup'), true),
('Cricket', 'Medium', 2011, 'Where was the 2011 Cricket World Cup final played?', 'Kolkata', 'Mumbai', 'Delhi', 'Chennai', 1, 'The final was played at Wankhede Stadium in Mumbai.', 'ICC World Cup records', 'verified', md5('cricket-2011-wc-venue'), true),
('Cricket', 'Hard', 2019, 'Who scored Englands highest individual score in the 2019 World Cup final?', 'Joe Root', 'Jos Buttler', 'Ben Stokes', 'Jason Roy', 2, 'Ben Stokes made 84 in the tied chase.', 'ICC World Cup 2019 scorecard', 'verified', md5('cricket-2019-stokes'), true),
('Cricket', 'Legendary', 2023, 'Which Australian bowler dismissed Rohit Sharma in the 2023 ODI World Cup final?', 'Mitchell Starc', 'Josh Hazlewood', 'Pat Cummins', 'Glenn Maxwell', 2, 'Pat Cummins took 2/34.', 'ICC World Cup 2023 scorecard', 'verified', md5('cricket-2023-final-cummins'), true);

-- Football
INSERT INTO public.questions (sport, difficulty, year, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source_name, verification_status, question_hash, active)
VALUES
('Football', 'Easy', 1994, 'Which nation won the 1994 FIFA World Cup?', 'Brazil', 'Italy', 'Germany', 'Argentina', 0, 'Brazil beat Italy on penalties.', 'FIFA World Cup records', 'verified', md5('football-1994-wc'), true),
('Football', 'Medium', 2010, 'Who scored the winning goal in the 2010 FIFA World Cup final?', 'David Villa', 'Andres Iniesta', 'Xavi', 'Fernando Torres', 1, 'Iniesta scored in extra time.', 'FIFA World Cup 2010', 'verified', md5('football-2010-iniesta'), true),
('Football', 'Hard', 2018, 'Which team reached its first World Cup final in 2018?', 'Belgium', 'Croatia', 'England', 'Portugal', 1, 'Croatia reached the final for the first time.', 'FIFA World Cup 2018', 'verified', md5('football-2018-croatia'), true),
('Football', 'Legendary', 2022, 'Who scored the opening goal of the 2022 World Cup final?', 'Lionel Messi', 'Angel Di Maria', 'Kylian Mbappe', 'Olivier Giroud', 0, 'Messi scored from the penalty spot.', 'FIFA World Cup 2022 final', 'verified', md5('football-2022-messi-opener'), true);

-- Basketball
INSERT INTO public.questions (sport, difficulty, year, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source_name, verification_status, question_hash, active)
VALUES
('Basketball', 'Easy', 1992, 'Which NBA team won the 1991-92 championship?', 'Chicago Bulls', 'Portland Trail Blazers', 'LA Lakers', 'Utah Jazz', 0, 'The Bulls won their second straight title.', 'NBA Finals records', 'verified', md5('basketball-1992-bulls'), true),
('Basketball', 'Medium', 2023, 'Which franchise won its first NBA championship in 2023?', 'Denver Nuggets', 'Miami Heat', 'Phoenix Suns', 'Milwaukee Bucks', 0, 'Denver beat Miami 4-1.', 'NBA Finals 2023', 'verified', md5('basketball-2023-nuggets'), true),
('Basketball', 'Hard', 2016, 'Which team overcame a 3-1 Finals deficit to win the 2016 NBA title?', 'Cleveland Cavaliers', 'Golden State Warriors', 'OKC Thunder', 'Toronto Raptors', 0, 'Cleveland made historic comeback.', 'NBA Finals 2016', 'verified', md5('basketball-2016-cavs'), true),
('Basketball', 'Legendary', 2020, 'Who won Finals MVP with the Lakers 2020 title?', 'Anthony Davis', 'LeBron James', 'Jimmy Butler', 'Rajon Rondo', 1, 'LeBron won his fourth Finals MVP.', 'NBA Finals 2020', 'verified', md5('basketball-2020-lebron'), true);

-- Tennis
INSERT INTO public.questions (sport, difficulty, year, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source_name, verification_status, question_hash, active)
VALUES
('Tennis', 'Easy', 1997, 'Who won the 1997 French Open mens singles title?', 'Gustavo Kuerten', 'Thomas Muster', 'Yevgeny Kafelnikov', 'Carlos Moya', 0, 'Kuerten won his first Grand Slam.', 'French Open records', 'verified', md5('tennis-1997-kuerten'), true),
('Tennis', 'Medium', 2008, 'Which Grand Slam did Nadal win after defeating Federer in an epic 2008 final?', 'US Open', 'Wimbledon', 'Australian Open', 'French Open', 1, 'The greatest match ever played.', 'Wimbledon 2008', 'verified', md5('tennis-2008-nadal-wimbledon'), true),
('Tennis', 'Hard', 2018, 'Who won the 2018 US Open womens singles title?', 'Serena Williams', 'Naomi Osaka', 'Simona Halep', 'Sloane Stephens', 1, 'Osaka won her first major.', 'US Open 2018', 'verified', md5('tennis-2018-osaka'), true),
('Tennis', 'Legendary', 2024, 'Who holds the most Grand Slam mens singles titles in the Open Era?', 'Novak Djokovic', 'Rafael Nadal', 'Roger Federer', 'Pete Sampras', 0, 'Djokovic holds 24 titles.', 'ATP records', 'verified', md5('tennis-most-slams-2024'), true);

-- Formula 1
INSERT INTO public.questions (sport, difficulty, year, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source_name, verification_status, question_hash, active)
VALUES
('Formula 1', 'Easy', 1994, 'Who won the 1994 Formula 1 World Championship?', 'Michael Schumacher', 'Damon Hill', 'Alain Prost', 'Nigel Mansell', 0, 'Schumachers first title with Benetton.', 'FIA F1 records', 'verified', md5('f1-1994-schumacher'), true),
('Formula 1', 'Medium', 2008, 'Who won the 2008 F1 World Championship?', 'Lewis Hamilton', 'Felipe Massa', 'Kimi Raikkonen', 'Fernando Alonso', 0, 'Hamilton won by one point in Brazil.', 'FIA F1 2008', 'verified', md5('f1-2008-hamilton'), true),
('Formula 1', 'Hard', 2021, 'At which GP was the 2021 championship decided?', 'Monaco GP', 'Abu Dhabi GP', 'British GP', 'Italian GP', 1, 'Dramatic last-lap finish.', 'FIA F1 2021', 'verified', md5('f1-2021-abu-dhabi'), true),
('Formula 1', 'Legendary', 2023, 'How many races did Verstappen win in the 2023 season?', '17', '19', '15', '21', 1, 'Record 19 of 22 races.', 'FIA F1 2023', 'verified', md5('f1-2023-verstappen-wins'), true);

-- Badminton
INSERT INTO public.questions (sport, difficulty, year, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source_name, verification_status, question_hash, active)
VALUES
('Badminton', 'Easy', 1992, 'When did badminton make its full Olympic debut?', '1988', '1992', '1996', '2000', 1, 'Barcelona 1992.', 'Olympic records', 'verified', md5('badminton-1992-olympic'), true),
('Badminton', 'Medium', 2016, 'Who won mens singles badminton gold at Rio 2016?', 'Chen Long', 'Lin Dan', 'Victor Axelsen', 'Lee Chong Wei', 0, 'Chen Long defeated Lee Chong Wei.', 'Olympic records 2016', 'verified', md5('badminton-2016-chen-long'), true),
('Badminton', 'Hard', 2023, 'Who won the 2023 BWF World Championships womens singles?', 'PV Sindhu', 'Akane Yamaguchi', 'Carolina Marin', 'An Se-young', 3, 'An Se-young won her first world title.', 'BWF 2023', 'verified', md5('badminton-2023-an-seyoung'), true),
('Badminton', 'Legendary', 2021, 'Who won mens singles badminton gold at Tokyo 2020?', 'Viktor Axelsen', 'Chen Long', 'Kento Momota', 'Anders Antonsen', 0, 'Axelsen won decisively.', 'Olympic records 2020', 'verified', md5('badminton-2021-axelsen'), true);

-- Hockey
INSERT INTO public.questions (sport, difficulty, year, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source_name, verification_status, question_hash, active)
VALUES
('Hockey', 'Easy', 1992, 'Which country won mens field hockey gold at Barcelona 1992?', 'Germany', 'Netherlands', 'Pakistan', 'Australia', 0, 'Germany won the title.', 'Olympic records', 'verified', md5('hockey-1992-germany'), true),
('Hockey', 'Medium', 2010, 'Who won the 2010 mens Hockey World Cup?', 'Germany', 'Australia', 'Netherlands', 'Spain', 1, 'Australia won in New Delhi.', 'FIH World Cup 2010', 'verified', md5('hockey-2010-australia'), true),
('Hockey', 'Hard', 2016, 'Which country won mens hockey gold at Rio 2016?', 'Germany', 'Argentina', 'Netherlands', 'Belgium', 1, 'Argentina beat Belgium.', 'Olympic records 2016', 'verified', md5('hockey-2016-argentina'), true),
('Hockey', 'Legendary', 2021, 'Who won mens Olympic hockey gold at Tokyo 2020?', 'India', 'Belgium', 'Australia', 'Germany', 1, 'Belgium won their first gold.', 'Olympic records 2020', 'verified', md5('hockey-2021-belgium'), true);

-- Athletics
INSERT INTO public.questions (sport, difficulty, year, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source_name, verification_status, question_hash, active)
VALUES
('Athletics', 'Easy', 2008, 'Who won mens 100m gold at Beijing 2008?', 'Usain Bolt', 'Tyson Gay', 'Asafa Powell', 'Richard Thompson', 0, 'Bolt ran 9.69 seconds.', 'Olympic records 2008', 'verified', md5('athletics-2008-bolt'), true),
('Athletics', 'Medium', 2009, 'What 100m world record did Bolt set at the 2009 Worlds?', '9.58', '9.69', '9.72', '9.63', 0, 'Bolt ran 9.58 in Berlin.', 'IAAF 2009', 'verified', md5('athletics-2009-bolt-wr'), true),
('Athletics', 'Hard', 2016, 'Who won mens marathon gold at Rio 2016?', 'Eliud Kipchoge', 'Feyisa Lilesa', 'Galen Rupp', 'Kenenisa Bekele', 0, 'Kipchoge won his first Olympic marathon.', 'Olympic records 2016', 'verified', md5('athletics-2016-kipchoge'), true),
('Athletics', 'Legendary', 2024, 'Who won mens 100m gold at Paris 2024?', 'Noah Lyles', 'Kishane Thompson', 'Fred Kerley', 'Oblique Seville', 0, 'Lyles won by five thousandths of a second.', 'Olympic records 2024', 'verified', md5('athletics-2024-lyles'), true);
