-- Apply after 003. Social writes go through authenticated server endpoints.
create table public.friendships (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references public.profiles(id) on delete cascade,
 recipient uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(sender <> recipient)
);
create unique index friendships_pair on public.friendships(least(sender, recipient), greatest(sender, recipient));
create table public.game_invitations (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references public.profiles(id) on delete cascade,
 recipient uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('challenge','multiplayer')),
 code text not null,
 read_at timestamptz,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '1 day'
);
create table public.challenge_plays (
 challenge_id uuid not null references public.challenge_sets(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(challenge_id,user_id)
);
alter table public.friendships enable row level security;
alter table public.game_invitations enable row level security;
alter table public.challenge_plays enable row level security;
create policy social_read on public.friendships for select to authenticated using(auth.uid() in (sender,recipient));
create policy invitation_read on public.game_invitations for select to authenticated using(auth.uid() in (sender,recipient));
create policy plays_read on public.challenge_plays for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.challenge_sets c where c.id=challenge_id and c.created_by=auth.uid()));
grant select on public.friendships,public.game_invitations,public.challenge_plays to authenticated;
alter publication supabase_realtime add table public.friendships, public.game_invitations, public.challenge_plays;
-- New challenge saves store the complete validated deck in settings atomically.
alter table public.game_rooms add column if not exists created_by uuid references auth.users(id) on delete set null;
grant all on public.friendships,public.game_invitations,public.challenge_plays to service_role;
