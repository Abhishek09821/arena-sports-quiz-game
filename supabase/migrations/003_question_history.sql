-- Append-only history shared by all modes. Only the owning account can read it.
create table if not exists public.question_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  question_text text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, question_key)
);

-- Migration 002 created an older version of this table. Upgrade it in place
-- instead of relying on CREATE TABLE IF NOT EXISTS, which does not add columns.
alter table public.question_history add column if not exists question_key text;
alter table public.question_history add column if not exists question_text text;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'question_history' and column_name = 'question_id'
  ) then
    alter table public.question_history alter column question_id drop not null;
  end if;
end
$$;
create unique index if not exists question_history_user_question_key_idx
  on public.question_history(user_id, question_key)
  where question_key is not null;

alter table public.question_history enable row level security;
drop policy if exists "Read own question history" on public.question_history;
drop policy if exists "Insert own question history" on public.question_history;
create policy "Read own question history" on public.question_history for select to authenticated using (auth.uid() = user_id);
create policy "Insert own question history" on public.question_history for insert to authenticated with check (auth.uid() = user_id);
grant select, insert on public.question_history to authenticated;

-- One transaction reserves an entire deck. A collision inserts nothing.
create or replace function public.reserve_question_history(entries jsonb)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(entries) <> 'array' or jsonb_array_length(entries) not between 1 and 30 then
    raise exception 'Invalid history batch';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists (
    select 1 from jsonb_to_recordset(entries) as e(question_key text, question_text text)
    join public.question_history h on h.user_id = auth.uid() and h.question_key = e.question_key
  ) then return false; end if;
  insert into public.question_history(user_id, question_key, question_text)
  select auth.uid(), e.question_key, e.question_text
  from jsonb_to_recordset(entries) as e(question_key text, question_text text);
  return true;
end;
$$;
revoke all on function public.reserve_question_history(jsonb) from public;
grant execute on function public.reserve_question_history(jsonb) to authenticated;
