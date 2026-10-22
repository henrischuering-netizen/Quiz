-- Online-Modus: Profile, Freundesliste, Spiele mit Lobby, Buzzer-Warteschlange, Text- und Sprachmodus.
-- Spiel-Aktionen laufen ausschließlich über die Funktionen unten (security definer), die prüfen, wer was darf.

------------------------------------------------------------------------------------------
-- Profile
------------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));
alter table public.profiles enable row level security;
drop policy if exists "profiles lesen" on public.profiles;
create policy "profiles lesen" on public.profiles for select to authenticated using (true);

create or replace function public._uid() returns uuid
language plpgsql stable as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet.';
  end if;
  return auth.uid();
end $$;

-- Gewünschter Name, falls gültig und frei, sonst ein Ersatzname wie user_1a2b3c4d.
create or replace function public._free_username(p_wanted text, p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_wanted ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (select 1 from profiles where lower(username) = lower(p_wanted)) then
    return p_wanted;
  end if;
  return 'user_' || substr(replace(p_id::text, '-', ''), 1, 8);
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, public._free_username(new.raw_user_meta_data ->> 'username', new.id))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profile für schon vorhandene Accounts (z. B. den Admin)
insert into public.profiles (id, username)
select id, public._free_username(raw_user_meta_data ->> 'username', id) from auth.users
on conflict (id) do nothing;

create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_username ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (select 1 from profiles where lower(username) = lower(p_username));
$$;

create or replace function public.set_username(p_username text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Benutzername: 3–20 Zeichen, nur Buchstaben, Ziffern und _.';
  end if;
  update profiles set username = p_username where id = _uid();
exception when unique_violation then
  raise exception 'Dieser Benutzername ist schon vergeben.';
end $$;

------------------------------------------------------------------------------------------
-- Freundesliste
------------------------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
alter table public.friendships enable row level security;
drop policy if exists "friendships eigene" on public.friendships;
create policy "friendships eigene" on public.friendships
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));

create or replace function public._are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(a, b)
      and greatest(requester_id, addressee_id) = greatest(a, b)
  );
$$;

create or replace function public.send_friend_request(p_username text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _uid();
  target uuid;
  f friendships;
begin
  select id into target from profiles where lower(username) = lower(trim(p_username));
  if target is null then
    raise exception 'Benutzer „%“ nicht gefunden.', trim(p_username);
  end if;
  if target = me then
    raise exception 'Du kannst dich nicht selbst hinzufügen.';
  end if;
  select * into f from friendships
  where least(requester_id, addressee_id) = least(me, target)
    and greatest(requester_id, addressee_id) = greatest(me, target);
  if found then
    if f.status = 'accepted' then
      raise exception 'Ihr seid schon befreundet.';
    end if;
    if f.requester_id = me then
      raise exception 'Du hast schon eine Anfrage gesendet.';
    end if;
    -- Der andere hat schon angefragt: dann gilt das als Annahme.
    update friendships set status = 'accepted' where id = f.id;
    return;
  end if;
  insert into friendships (requester_id, addressee_id) values (me, target);
end $$;

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _uid();
begin
  if p_accept then
    update friendships set status = 'accepted' where id = p_id and addressee_id = me and status = 'pending';
  else
    delete from friendships where id = p_id and addressee_id = me and status = 'pending';
  end if;
  if not found then
    raise exception 'Anfrage nicht gefunden.';
  end if;
end $$;

-- Entfernt einen Freund oder zieht eine eigene Anfrage zurück.
create or replace function public.remove_friend(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _uid();
begin
  delete from friendships
  where least(requester_id, addressee_id) = least(me, p_user)
    and greatest(requester_id, addressee_id) = greatest(me, p_user);
end $$;

create or replace function public.list_friends()
returns table (friendship_id uuid, user_id uuid, username text, status text)
language sql stable security definer set search_path = public as $$
  select f.id, p.id, p.username,
         case
           when f.status = 'accepted' then 'friend'
           when f.requester_id = auth.uid() then 'outgoing'
           else 'incoming'
         end
  from friendships f
  join profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by lower(p.username);
$$;

------------------------------------------------------------------------------------------
-- Spiele
------------------------------------------------------------------------------------------
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('text', 'voice')),
  status text not null default 'lobby'
    check (status in ('lobby', 'board', 'question', 'round_end', 'finished')),
  round int not null default 1,
  active_cell_id uuid,
  answer_visible boolean not null default false,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  -- Jede Aktion setzt updated_at neu; darauf hören die Clients per Realtime.
  updated_at timestamptz not null default now()
);

create table if not exists public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create table if not exists public.game_invites (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

-- Kategorien je Runde (Spalte col = 1..5). category_id ohne Fremdschlüssel,
-- damit das Löschen einer Kategorie laufende Spiele nicht stört.
create table if not exists public.game_categories (
  game_id uuid not null references public.games (id) on delete cascade,
  round int not null,
  col int not null,
  category_id uuid,
  name text not null,
  primary key (game_id, round, col)
);

-- Frage und Antwort werden beim Rundenstart kopiert.
create table if not exists public.game_cells (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  round int not null,
  col int not null,
  difficulty int not null,
  points int not null,
  question text not null,
  answer text not null,
  used boolean not null default false,
  unique (game_id, round, col, difficulty)
);

-- Buzzer-Warteschlange: Reihenfolge = id (vergeben unter Sperre der Spielzeile).
create table if not exists public.buzzes (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  cell_id uuid not null references public.game_cells (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  answer_text text,
  result text check (result in ('correct', 'wrong')),
  unique (cell_id, user_id)
);

alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_invites enable row level security;
alter table public.game_categories enable row level security;
alter table public.game_cells enable row level security;
alter table public.buzzes enable row level security;

create or replace function public.is_game_member(p_game uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from games where id = p_game and host_id = auth.uid())
      or exists (select 1 from game_players where game_id = p_game and user_id = auth.uid());
$$;

-- Direkt lesbar (für Realtime) sind nur die Spielzeile und die eigenen Einladungen.
-- Alles andere liefert get_game_state, damit Antworten geheim bleiben.
drop policy if exists "games mitglieder" on public.games;
create policy "games mitglieder" on public.games for select to authenticated using (public.is_game_member(id));
drop policy if exists "invites eigene" on public.game_invites;
create policy "invites eigene" on public.game_invites for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.games g where g.id = game_id and g.host_id = auth.uid()));

create or replace function public._touch(p_game uuid) returns void
language sql security definer set search_path = public as $$
  update games set updated_at = clock_timestamp() where id = p_game;
$$;

-- Sperrt die Spielzeile (serialisiert alle Aktionen eines Spiels) und prüft die Rolle.
create or replace function public._lock_game(p_game uuid, p_host_only boolean) returns public.games
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _uid();
  g games;
begin
  select * into g from games where id = p_game for update;
  if not found then
    raise exception 'Spiel nicht gefunden.';
  end if;
  if g.host_id <> me then
    if p_host_only then
      raise exception 'Nur der Host darf das.';
    end if;
    if not exists (select 1 from game_players where game_id = p_game and user_id = me) then
      raise exception 'Du spielst in diesem Spiel nicht mit.';
    end if;
  end if;
  return g;
end $$;

-- Stellt eine Runde zusammen: 5 zufällige Kategorien mit Fragen für alle 4 Stufen,
-- bereits gespielte Kategorien nur, wenn sonst nicht genug übrig sind.
-- Punkte 100/200/300/500, ab Runde 2 doppelt (siehe src/lib/game.ts).
create or replace function public._build_round(p_game uuid, p_round int) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_points int[] := array[100, 200, 300, 500];
  v_mult int := case when p_round = 1 then 1 else 2 end;
  v_cat record;
  v_col int := 0;
begin
  for v_cat in
    select c.id, c.name
    from categories c
    where (select count(distinct q.difficulty) from questions q
           where q.category_id = c.id and q.difficulty between 1 and 4) = 4
    order by exists (select 1 from game_categories gc where gc.game_id = p_game and gc.category_id = c.id),
             random()
    limit 5
  loop
    v_col := v_col + 1;
    insert into game_categories (game_id, round, col, category_id, name)
    values (p_game, p_round, v_col, v_cat.id, v_cat.name);
    insert into game_cells (game_id, round, col, difficulty, points, question, answer)
    select p_game, p_round, v_col, d, v_points[d] * v_mult, q.question, q.answer
    from generate_series(1, 4) as d
    cross join lateral (
      select question, answer from questions
      where category_id = v_cat.id and difficulty = d
      order by random() limit 1
    ) q;
  end loop;
  if v_col = 0 then
    raise exception 'Es gibt keine Kategorie mit Fragen für alle Punktstufen.';
  end if;
end $$;

create or replace function public.create_game(p_mode text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _uid();
  v_code text;
  v_id uuid;
begin
  if p_mode not in ('text', 'voice') then
    raise exception 'Unbekannter Modus.';
  end if;
  loop
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from games where code = v_code);
  end loop;
  insert into games (code, host_id, mode) values (v_code, me, p_mode) returning id into v_id;
  return v_id;
end $$;

create or replace function public.invite_to_game(p_game uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g games := _lock_game(p_game, true);
begin
  if g.status = 'finished' then
    raise exception 'Das Spiel ist beendet.';
  end if;
  if not _are_friends(g.host_id, p_user) then
    raise exception 'Du kannst nur Freunde einladen.';
  end if;
  if exists (select 1 from game_players where game_id = p_game and user_id = p_user) then
    return;
  end if;
  insert into game_invites (game_id, user_id) values (p_game, p_user)
  on conflict (game_id, user_id) do update set status = 'pending', created_at = now();
  perform _touch(p_game);
end $$;

create or replace function public.respond_invite(p_game uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _uid();
  g games;
begin
  select * into g from games where id = p_game for update;
  if not found or not exists (select 1 from game_invites where game_id = p_game and user_id = me) then
    raise exception 'Einladung nicht gefunden.';
  end if;
  if p_accept then
    if g.status = 'finished' then
      raise exception 'Das Spiel ist schon beendet.';
    end if;
    insert into game_players (game_id, user_id) values (p_game, me) on conflict do nothing;
  end if;
  update game_invites set status = case when p_accept then 'accepted' else 'declined' end
  where game_id = p_game and user_id = me;
  perform _touch(p_game);
end $$;

create or replace function public.join_game_by_code(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _uid();
  g games;
begin
  select * into g from games where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'Kein Spiel mit diesem Code.';
  end if;
  if g.status = 'finished' then
    raise exception 'Das Spiel ist schon beendet.';
  end if;
  if g.host_id <> me then
    insert into game_players (game_id, user_id) values (g.id, me) on conflict do nothing;
    update game_invites set status = 'accepted' where game_id = g.id and user_id = me;
    perform _touch(g.id);
  end if;
  return g.id;
end $$;

create or replace function public.start_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g games := _lock_game(p_game, true);
begin
  if g.status <> 'lobby' then
    raise exception 'Das Spiel läuft schon.';
  end if;
  if not exists (select 1 from game_players where game_id = p_game) then
    raise exception 'Es ist noch kein Spieler beigetreten.';
  end if;
  perform _build_round(p_game, 1);
  update games set status = 'board', round = 1, updated_at = clock_timestamp() where id = p_game;
end $$;

create or replace function public.open_cell(p_game uuid, p_cell uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g games := _lock_game(p_game, true);
begin
  if g.status <> 'board' then
    raise exception 'Gerade kann keine Frage geöffnet werden.';
  end if;
  if not exists (select 1 from game_cells where id = p_cell and game_id = p_game and round = g.round and not used) then
    raise exception 'Diese Frage ist nicht mehr verfügbar.';
  end if;
  update games
  set status = 'question', active_cell_id = p_cell, answer_visible = false, resolved = false,
      updated_at = clock_timestamp()
  where id = p_game;
end $$;

create or replace function public.buzz(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _uid();
  g games := _lock_game(p_game, false);
begin
  if g.host_id = me then
    raise exception 'Der Host buzzert nicht.';
  end if;
  if g.status <> 'question' or g.resolved then
    raise exception 'Der Buzzer ist gerade nicht offen.';
  end if;
  insert into buzzes (game_id, cell_id, user_id) values (p_game, g.active_cell_id, me)
  on conflict (cell_id, user_id) do nothing;
  perform _touch(p_game);
end $$;

create or replace function public.submit_answer(p_game uuid, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := _uid();
  g games := _lock_game(p_game, false);
  b buzzes;
begin
  if g.mode <> 'text' then
    raise exception 'Im Sprachmodus wird nicht getippt.';
  end if;
  if g.status <> 'question' or g.resolved then
    raise exception 'Die Frage ist schon entschieden.';
  end if;
  select * into b from buzzes where cell_id = g.active_cell_id and result is null order by id limit 1;
  if b.id is null or b.user_id <> me then
    raise exception 'Du bist gerade nicht dran.';
  end if;
  if b.answer_text is not null then
    raise exception 'Du hast schon geantwortet.';
  end if;
  if length(trim(coalesce(p_text, ''))) = 0 then
    raise exception 'Bitte eine Antwort eingeben.';
  end if;
  update buzzes set answer_text = left(trim(p_text), 200) where id = b.id;
  perform _touch(p_game);
end $$;

-- Bewertet den Spieler, der gerade dran ist. Falsch: halbe Punkte abziehen, der Nächste in der Schlange ist dran.
create or replace function public.judge(p_game uuid, p_correct boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  g games := _lock_game(p_game, true);
  b buzzes;
  v_points int;
begin
  if g.status <> 'question' or g.resolved then
    raise exception 'Gerade gibt es nichts zu bewerten.';
  end if;
  select * into b from buzzes where cell_id = g.active_cell_id and result is null order by id limit 1;
  if b.id is null then
    raise exception 'Niemand ist gerade dran.';
  end if;
  select points into v_points from game_cells where id = g.active_cell_id;
  update buzzes set result = case when p_correct then 'correct' else 'wrong' end where id = b.id;
  update game_players
  set score = score + case when p_correct then v_points else -(v_points / 2) end
  where game_id = p_game and user_id = b.user_id;
  if p_correct then
    update games set resolved = true, answer_visible = true where id = p_game;
  end if;
  perform _touch(p_game);
end $$;

create or replace function public.reveal(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g games := _lock_game(p_game, true);
begin
  if g.status <> 'question' then
    raise exception 'Gerade ist keine Frage offen.';
  end if;
  update games set resolved = true, answer_visible = true, updated_at = clock_timestamp() where id = p_game;
end $$;

create or replace function public.close_cell(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g games := _lock_game(p_game, true);
  v_left int;
begin
  if g.status <> 'question' then
    raise exception 'Gerade ist keine Frage offen.';
  end if;
  update game_cells set used = true where id = g.active_cell_id;
  select count(*) into v_left from game_cells where game_id = p_game and round = g.round and not used;
  update games
  set active_cell_id = null, answer_visible = false, resolved = false,
      status = case when v_left > 0 then 'board' when g.round < 2 then 'round_end' else 'finished' end,
      updated_at = clock_timestamp()
  where id = p_game;
end $$;

create or replace function public.next_round(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g games := _lock_game(p_game, true);
begin
  if g.status <> 'round_end' then
    raise exception 'Die Runde ist noch nicht vorbei.';
  end if;
  perform _build_round(p_game, g.round + 1);
  update games set status = 'board', round = g.round + 1, updated_at = clock_timestamp() where id = p_game;
end $$;

create or replace function public.end_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g games := _lock_game(p_game, true);
begin
  update games
  set status = 'finished', active_cell_id = null, updated_at = clock_timestamp()
  where id = g.id;
end $$;

-- Kompletter Spielstand aus Sicht des Aufrufers. Die Antwort sieht nur der Host, bis sie aufgelöst ist.
create or replace function public.get_game_state(p_game uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := _uid();
  g games;
  v_host boolean;
  v_cell game_cells;
  v_active jsonb;
begin
  select * into g from games where id = p_game;
  if not found then
    raise exception 'Spiel nicht gefunden.';
  end if;
  v_host := g.host_id = me;
  if not v_host and not exists (select 1 from game_players where game_id = p_game and user_id = me) then
    raise exception 'Du spielst in diesem Spiel nicht mit.';
  end if;

  if g.active_cell_id is not null then
    select * into v_cell from game_cells where id = g.active_cell_id;
    v_active := jsonb_build_object(
      'id', v_cell.id,
      'col', v_cell.col,
      'points', v_cell.points,
      'question', v_cell.question,
      'answer', case when v_host or g.answer_visible then v_cell.answer end,
      'category', (select name from game_categories
                   where game_id = p_game and round = v_cell.round and col = v_cell.col),
      'queue', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'user_id', b.user_id,
                 'username', p.username,
                 'result', b.result,
                 'answered', b.answer_text is not null,
                 'answer_text', case when v_host or b.user_id = me or b.result is not null or g.resolved
                                     then b.answer_text end
               ) order by b.id)
        from buzzes b join profiles p on p.id = b.user_id
        where b.cell_id = v_cell.id), '[]'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'id', g.id,
    'code', g.code,
    'mode', g.mode,
    'status', g.status,
    'round', g.round,
    'answer_visible', g.answer_visible,
    'resolved', g.resolved,
    'is_host', v_host,
    'me', me,
    'host', (select jsonb_build_object('user_id', id, 'username', username) from profiles where id = g.host_id),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', gp.user_id, 'username', p.username, 'score', gp.score)
                       order by gp.joined_at)
      from game_players gp join profiles p on p.id = gp.user_id
      where gp.game_id = p_game), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('col', col, 'name', name) order by col)
      from game_categories where game_id = p_game and round = g.round), '[]'::jsonb),
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'col', col, 'difficulty', difficulty,
                                          'points', points, 'used', used) order by col, difficulty)
      from game_cells where game_id = p_game and round = g.round), '[]'::jsonb),
    'active', v_active,
    'invites', case when v_host then coalesce((
      select jsonb_agg(jsonb_build_object('user_id', i.user_id, 'username', p.username, 'status', i.status))
      from game_invites i join profiles p on p.id = i.user_id
      where i.game_id = p_game), '[]'::jsonb) end
  );
end $$;

create or replace function public.list_my_games()
returns table (id uuid, code text, mode text, status text, host_username text, is_host boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.id, g.code, g.mode, g.status, p.username, g.host_id = auth.uid(), g.created_at
  from games g join profiles p on p.id = g.host_id
  where g.status <> 'finished'
    and (g.host_id = auth.uid()
         or exists (select 1 from game_players gp where gp.game_id = g.id and gp.user_id = auth.uid()))
  order by g.created_at desc
  limit 20;
$$;

create or replace function public.list_my_invites()
returns table (game_id uuid, host_username text, mode text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.id, p.username, g.mode, i.created_at
  from game_invites i
  join games g on g.id = i.game_id
  join profiles p on p.id = g.host_id
  where i.user_id = auth.uid() and i.status = 'pending' and g.status <> 'finished'
  order by i.created_at desc;
$$;

------------------------------------------------------------------------------------------
-- Antworten geheim halten: Spieler dürfen questions.answer nicht direkt lesen.
------------------------------------------------------------------------------------------
revoke select on public.questions from anon, authenticated;
grant select (id, category_id, difficulty, question, created_at) on public.questions to anon, authenticated;

create or replace function public.admin_list_questions()
returns table (id uuid, category_id uuid, difficulty int, question text, answer text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Keine Berechtigung.';
  end if;
  return query select q.id, q.category_id, q.difficulty, q.question, q.answer from public.questions q;
end $$;

------------------------------------------------------------------------------------------
-- Interne Hilfsfunktionen nicht von außen aufrufbar machen
------------------------------------------------------------------------------------------
revoke execute on function public._uid() from public, anon, authenticated;
revoke execute on function public._free_username(text, uuid) from public, anon, authenticated;
revoke execute on function public._are_friends(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._touch(uuid) from public, anon, authenticated;
revoke execute on function public._lock_game(uuid, boolean) from public, anon, authenticated;
revoke execute on function public._build_round(uuid, int) from public, anon, authenticated;

------------------------------------------------------------------------------------------
-- Realtime
------------------------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.games, public.friendships, public.game_invites;
exception when duplicate_object then
  null;
end $$;
