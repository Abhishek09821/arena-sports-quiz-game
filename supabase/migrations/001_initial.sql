-- ═══════════════════════════════════════════════════════════════
-- ARENA — Full Database Schema
-- Supabase PostgreSQL with RLS
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Questions Table ────────────────────────────────────────
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('Cricket','Football','Basketball','Tennis','Formula 1','Badminton','Hockey','Athletics')),
  category text,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option smallint not null check (correct_option between 0 and 3),
  explanation text,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard','Legendary')),
  year int not null check (year between 1990 and 2026),
  event_date date,
  source_url text,
  source_name text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  tags text[] default '{}',
  era text,
  question_hash text,
  times_used int not null default 0,
  last_used_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_questions_sport on public.questions(sport);
create index if not exists idx_questions_difficulty on public.questions(difficulty);
create index if not exists idx_questions_year on public.questions(year);
create index if not exists idx_questions_verification on public.questions(verification_status);
create index if not exists idx_questions_active on public.questions(active);
create index if not exists idx_questions_hash on public.questions(question_hash);
create index if not exists idx_questions_sport_diff on public.questions(sport, difficulty) where active = true;
create index if not exists idx_questions_last_used on public.questions(last_used_at nulls first) where active = true;

-- Unique constraint on question_hash for duplicate detection
create unique index if not exists idx_questions_hash_unique on public.questions(question_hash) where question_hash is not null;

-- ── Challenges Table ───────────────────────────────────────
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  creator_name text,
  question_ids uuid[] not null,
  settings jsonb not null default '{}'::jsonb,
  play_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz default now() + interval '7 days'
);

create index if not exists idx_challenges_code on public.challenges(code);

-- ── Game Rooms ─────────────────────────────────────────────
create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  mode text not null check (mode in ('buzzer','sprint')),
  status text not null default 'waiting' check (status in ('waiting','live','finished')),
  question_ids uuid[] default '{}',
  settings jsonb not null default '{}'::jsonb,
  current_round smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Game Players ───────────────────────────────────────────
create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  display_name text not null,
  player_token text not null,
  score int not null default 0,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  best_streak int not null default 0,
  connected boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_players_room on public.game_players(room_id);

-- ── Game Events ────────────────────────────────────────────
create table if not exists public.game_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  player_id uuid references public.game_players(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  server_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_game_events_room on public.game_events(room_id, created_at);
create index if not exists idx_game_events_type on public.game_events(event_type);

-- ── Analytics Events ───────────────────────────────────────
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_type on public.analytics_events(event_type, created_at);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.questions enable row level security;
alter table public.challenges enable row level security;
alter table public.game_rooms enable row level security;
alter table public.game_players enable row level security;
alter table public.game_events enable row level security;
alter table public.analytics_events enable row level security;

-- Questions: public can only read verified + active questions
create policy "public_read_verified_questions" on public.questions
  for select to anon using (verification_status = 'verified' and active = true);

-- Challenges: anyone can read, anon can create
create policy "public_read_challenges" on public.challenges
  for select to anon using (true);

create policy "anon_create_challenges" on public.challenges
  for insert to anon with check (true);

-- Game rooms: public read, anon create
create policy "anon_read_rooms" on public.game_rooms
  for select to anon using (true);

create policy "anon_create_rooms" on public.game_rooms
  for insert to anon with check (true);

-- Game players: public read, anon create
create policy "anon_read_players" on public.game_players
  for select to anon using (true);

create policy "anon_create_players" on public.game_players
  for insert to anon with check (true);

-- Game events: public read, anon create
create policy "anon_read_events" on public.game_events
  for select to anon using (true);

create policy "anon_create_events" on public.game_events
  for insert to anon with check (true);

-- Analytics: anon can insert only (no read for anon)
create policy "anon_insert_analytics" on public.analytics_events
  for insert to anon with check (true);

-- ═══════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.game_rooms;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.game_events;

-- ═══════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger questions_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create trigger game_rooms_updated_at
  before update on public.game_rooms
  for each row execute function public.set_updated_at();

-- Increment times_used and set last_used_at when a question is used
create or replace function public.mark_question_used(question_id uuid)
returns void as $$
begin
  update public.questions
  set times_used = times_used + 1, last_used_at = now()
  where id = question_id;
end;
$$ language plpgsql security definer;
