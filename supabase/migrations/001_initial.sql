create extension if not exists pgcrypto;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  sport text not null,
  year int not null check (year between 1990 and 2026),
  difficulty text not null check (difficulty in ('Easy','Medium','Hard','Legendary')),
  prompt text not null,
  options jsonb not null,
  answer_index smallint not null check (answer_index between 0 and 3),
  explanation text,
  source_notes text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists questions_sport_idx on public.questions(sport);
create index if not exists questions_difficulty_idx on public.questions(difficulty);
create index if not exists questions_year_idx on public.questions(year);
create index if not exists questions_verified_idx on public.questions(verified);

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  mode text not null check (mode in ('buzzer','sprint')),
  status text not null default 'waiting' check (status in ('waiting','live','finished')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  display_name text not null,
  player_token text not null,
  score int not null default 0,
  connected boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.game_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  player_id uuid references public.game_players(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_players_room_idx on public.game_players(room_id);
create index if not exists game_events_room_idx on public.game_events(room_id, created_at);

alter table public.questions enable row level security;
alter table public.game_rooms enable row level security;
alter table public.game_players enable row level security;
alter table public.game_events enable row level security;

create policy "public can read verified questions" on public.questions
  for select to anon using (verified = true);

create policy "anon can create rooms" on public.game_rooms
  for insert to anon with check (true);

create policy "anon can read rooms by code" on public.game_rooms
  for select to anon using (true);

create policy "anon can create players" on public.game_players
  for insert to anon with check (true);

create policy "anon can read players" on public.game_players
  for select to anon using (true);

create policy "anon can create events" on public.game_events
  for insert to anon with check (true);

create policy "anon can read events" on public.game_events
  for select to anon using (true);

-- Realtime publication for development. Tighten RLS/authorization before public launch.
alter publication supabase_realtime add table public.game_rooms;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.game_events;
