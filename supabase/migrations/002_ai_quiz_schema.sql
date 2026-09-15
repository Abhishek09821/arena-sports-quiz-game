-- ═══════════════════════════════════════════════════════════════
-- ARENA — AI Quiz & Persistent System Migration (002)
-- Supabase PostgreSQL Schema with Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── 1. PROFILES TABLE ─────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  avatar_url text,
  total_games_played int not null default 0,
  total_score bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

-- Automatically create profile on new user registration in Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if already exists then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. ADAPT QUESTIONS TABLE ──────────────────────────────────
-- Ensure questions table has necessary columns for AI generation
alter table public.questions add column if not exists source_type text default 'ai';
alter table public.questions add column if not exists options jsonb;
alter table public.questions add column if not exists correct_answer text;

-- Relax year check constraint if it was restrictive so AI questions from all years are accepted
alter table public.questions drop constraint if exists questions_year_check;
alter table public.questions alter column year drop not null;

-- Ensure question_hash has an index for fast duplicate checks
create index if not exists idx_questions_hash on public.questions(question_hash);

-- ── 3. QUIZ SESSIONS TABLE ────────────────────────────────────
create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  sport text not null,
  difficulty text not null,
  question_count int not null default 10,
  mode text not null default 'classic' check (mode in ('classic', 'sprint', 'challenge', 'buzzer')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  score int not null default 0,
  accuracy numeric(5,2) not null default 0.00,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  best_streak int not null default 0,
  total_time_seconds int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_quiz_sessions_user on public.quiz_sessions(user_id);
create index if not exists idx_quiz_sessions_status on public.quiz_sessions(status);
create index if not exists idx_quiz_sessions_created on public.quiz_sessions(created_at desc);

-- ── 4. QUIZ SESSION QUESTIONS (Deck & Answer Log) ──────────────
create table if not exists public.quiz_session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  question_order int not null,
  selected_option smallint,
  correct_option smallint,
  is_correct boolean,
  time_left int,
  points_earned int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_questions_session on public.quiz_session_questions(session_id);
create index if not exists idx_session_questions_question on public.quiz_session_questions(question_id);

-- ── 5. QUESTION HISTORY / USAGE (Non-Repetition Per User) ──────
create table if not exists public.question_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  session_id uuid references public.quiz_sessions(id) on delete cascade,
  sport text,
  difficulty text,
  question_hash text,
  used_at timestamptz not null default now()
);

create index if not exists idx_qhistory_user on public.question_history(user_id);
create index if not exists idx_qhistory_user_sport on public.question_history(user_id, sport);
create index if not exists idx_qhistory_user_hash on public.question_history(user_id, question_hash);

-- ── 6. CHALLENGE SETS & CHALLENGE QUESTIONS ───────────────────
create table if not exists public.challenge_sets (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid references auth.users(id) on delete set null,
  creator_name text default 'Anonymous',
  title text not null,
  sport text not null default 'All Sports',
  difficulty text not null default 'Mixed',
  question_count int not null default 10,
  play_count int not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz default (now() + interval '30 days')
);

create index if not exists idx_challenge_sets_code on public.challenge_sets(code);
create index if not exists idx_challenge_sets_creator on public.challenge_sets(created_by);

create table if not exists public.challenge_questions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenge_sets(id) on delete cascade,
  question_order int not null,
  question_text text not null,
  options jsonb not null,
  correct_answer text not null,
  correct_option smallint not null default 0 check (correct_option between 0 and 3),
  explanation text,
  sport text,
  difficulty text,
  created_at timestamptz not null default now()
);

create index if not exists idx_challenge_questions_challenge on public.challenge_questions(challenge_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_session_questions enable row level security;
alter table public.question_history enable row level security;
alter table public.challenge_sets enable row level security;
alter table public.challenge_questions enable row level security;

-- Helper function to check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- ── Profiles RLS ──────────────────────────────────────────────
create policy "users_read_own_profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "users_update_own_profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "public_read_creator_profiles" on public.profiles
  for select to anon
  using (true);

-- ── Quiz Sessions RLS ─────────────────────────────────────────
create policy "users_manage_own_sessions" on public.quiz_sessions
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "anon_manage_guest_sessions" on public.quiz_sessions
  for all to anon
  using (user_id is null)
  with check (user_id is null);

-- ── Quiz Session Questions RLS ────────────────────────────────
create policy "users_manage_session_questions" on public.quiz_session_questions
  for all to authenticated
  using (
    exists (
      select 1 from public.quiz_sessions s
      where s.id = quiz_session_questions.session_id
      and (s.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "anon_manage_session_questions" on public.quiz_session_questions
  for all to anon
  using (
    exists (
      select 1 from public.quiz_sessions s
      where s.id = quiz_session_questions.session_id
      and s.user_id is null
    )
  );

-- ── Question History RLS ──────────────────────────────────────
create policy "users_manage_own_history" on public.question_history
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- ── Questions Table RLS ───────────────────────────────────────
-- Ensure anyone can read active questions
drop policy if exists "public_read_verified_questions" on public.questions;
create policy "anyone_read_active_questions" on public.questions
  for select to public
  using (active = true);

-- Authenticated users or server role can insert questions
create policy "authenticated_insert_questions" on public.questions
  for insert to authenticated
  with check (true);

create policy "anon_insert_questions" on public.questions
  for insert to anon
  with check (true);

-- ── Challenge Sets & Questions RLS ────────────────────────────
create policy "anyone_read_challenge_sets" on public.challenge_sets
  for select to public
  using (true);

create policy "anyone_create_challenge_sets" on public.challenge_sets
  for insert to public
  with check (true);

create policy "creator_update_challenge_sets" on public.challenge_sets
  for update to authenticated
  using (created_by = auth.uid() or public.is_admin());

create policy "anyone_read_challenge_questions" on public.challenge_questions
  for select to public
  using (true);

create policy "anyone_create_challenge_questions" on public.challenge_questions
  for insert to public
  with check (true);
