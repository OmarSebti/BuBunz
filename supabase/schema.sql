create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bounce_count integer not null default 0,
  last_bounce_at timestamptz
);

create or replace function increment_bounce(p_session_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
  v_last timestamptz;
begin
  select bounce_count, last_bounce_at
    into v_count, v_last
    from game_sessions
   where id = p_session_id;

  if not found then
    insert into game_sessions (id, bounce_count, last_bounce_at)
    values (p_session_id, 1, now())
    returning bounce_count into v_count;
    return v_count;
  end if;

  if v_last is not null and extract(epoch from (now() - v_last)) < 0.15 then
    return v_count;
  end if;

  update game_sessions
     set bounce_count = bounce_count + 1,
         last_bounce_at = now()
   where id = p_session_id
   returning bounce_count into v_count;

  return v_count;
end;
$$;

alter table game_sessions enable row level security;
create policy "sessions_own" on game_sessions
  using (true) with check (true);
