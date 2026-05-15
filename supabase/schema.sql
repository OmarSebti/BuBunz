-- game_sessions (keep existing, add user_id column)
create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bounce_count integer not null default 0,
  last_bounce_at timestamptz,
  user_id uuid references auth.users(id) on delete set null
);

-- profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique not null,
  created_at timestamptz default now(),
  constraint nickname_format check (nickname ~ '^[a-zA-Z0-9_]{3,20}$')
);

-- increment_bounce: rate-limited, also sets user_id if caller is authenticated
create or replace function increment_bounce(p_session_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
  v_last timestamptz;
  v_uid uuid;
begin
  v_uid := auth.uid();

  select bounce_count, last_bounce_at
    into v_count, v_last
    from game_sessions
   where id = p_session_id;

  if not found then
    insert into game_sessions (id, bounce_count, last_bounce_at, user_id)
    values (p_session_id, 1, now(), v_uid)
    returning bounce_count into v_count;
    return v_count;
  end if;

  if v_last is not null and extract(epoch from (now() - v_last)) < 0.15 then
    return v_count;
  end if;

  update game_sessions
     set bounce_count    = bounce_count + 1,
         last_bounce_at  = now(),
         user_id         = coalesce(user_id, v_uid)
   where id = p_session_id
   returning bounce_count into v_count;

  return v_count;
end;
$$;

-- link_session_to_user: called after sign-in to attribute anonymous bounces
create or replace function link_session_to_user(p_session_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update game_sessions
     set user_id = auth.uid()
   where id = p_session_id
     and user_id is null;
end;
$$;

-- scoreboard view: sum bounces per authenticated user
create or replace view scoreboard as
  select
    p.nickname,
    coalesce(sum(gs.bounce_count), 0)::integer as total_bounces,
    p.id as user_id
  from profiles p
  left join game_sessions gs on gs.user_id = p.id
  group by p.id, p.nickname
  order by total_bounces desc
  limit 50;

-- RLS
alter table game_sessions enable row level security;
drop policy if exists "sessions_own" on game_sessions;
create policy "anon_own_session" on game_sessions
  for all using (
    (user_id is null) or (user_id = auth.uid())
  );

alter table profiles enable row level security;
create policy "profiles_read_all" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());

grant select on scoreboard to anon, authenticated;
