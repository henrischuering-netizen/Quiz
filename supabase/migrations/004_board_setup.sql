-- Der Host kann Kategorien und/oder Fragen pro Runde selbst festlegen.
-- Gespeichert als Plan je Spiel; nicht festgelegte Felder werden beim Rundenstart zufällig gefüllt.
--
-- setup = {
--   "categories_mode": "random" | "choose",   -- nur für die Oberfläche
--   "questions_mode":  "random" | "choose",   -- nur für die Oberfläche
--   "rounds": [                               -- Index 0 = Runde 1
--     [ { "category_id": uuid | null, "questions": [uuid | null, ...4] }, ...5 ],
--     ...
--   ]
-- }

-- Eigene Tabelle ohne Lese-Policy: Spieler sollen den Plan nicht sehen.
create table if not exists public.game_setups (
  game_id uuid primary key references public.games (id) on delete cascade,
  setup jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.game_setups enable row level security;

create or replace function public._category_complete(p_category uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(distinct difficulty) from questions
          where category_id = p_category and difficulty between 1 and 4) = 4;
$$;

create or replace function public.set_game_setup(p_game uuid, p_setup jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  g games := _lock_game(p_game, true);
begin
  if g.status not in ('lobby', 'round_end') then
    raise exception 'Das Board kann nur in der Lobby oder zwischen den Runden geändert werden.';
  end if;
  if jsonb_typeof(p_setup -> 'rounds') is distinct from 'array' then
    raise exception 'Ungültiger Board-Plan.';
  end if;
  insert into game_setups (game_id, setup) values (p_game, p_setup)
  on conflict (game_id) do update set setup = excluded.setup, updated_at = now();
end $$;

create or replace function public.get_game_setup(p_game uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := _uid();
begin
  if not exists (select 1 from games where id = p_game and host_id = me) then
    raise exception 'Nur der Host darf das.';
  end if;
  return (select setup from game_setups where game_id = p_game);
end $$;

-- Ersetzt die Version aus 003: berücksichtigt jetzt den Plan des Hosts.
-- Gewählte Kategorie/Frage wird genommen, wenn sie (noch) gültig ist, sonst Zufall.
create or replace function public._build_round(p_game uuid, p_round int) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_points int[] := array[100, 200, 300, 500];
  v_mult int := case when p_round = 1 then 1 else 2 end;
  v_slots jsonb;
  v_slot jsonb;
  v_chosen uuid[];
  v_used uuid[] := '{}';
  v_cat_id uuid;
  v_cat_name text;
  v_qid uuid;
  v_col int := 0;
begin
  select coalesce(setup -> 'rounds' -> (p_round - 1), '[]'::jsonb) into v_slots
  from game_setups where game_id = p_game;
  if v_slots is null or jsonb_typeof(v_slots) <> 'array' then
    v_slots := '[]'::jsonb;
  end if;

  -- Vom Host gewählte Kategorien dieser Runde nicht für Zufallsplätze verbrauchen
  select coalesce(array_agg((s ->> 'category_id')::uuid) filter (where s ->> 'category_id' is not null), '{}')
    into v_chosen
  from jsonb_array_elements(v_slots) s;

  for i in 0 .. 4 loop
    v_slot := v_slots -> i;
    v_cat_id := null;

    if v_slot ->> 'category_id' is not null then
      select c.id, c.name into v_cat_id, v_cat_name
      from categories c
      where c.id = (v_slot ->> 'category_id')::uuid
        and not (c.id = any (v_used))
        and _category_complete(c.id);
    end if;

    if v_cat_id is null then
      select c.id, c.name into v_cat_id, v_cat_name
      from categories c
      where _category_complete(c.id)
        and not (c.id = any (v_used))
        and not (c.id = any (v_chosen))
      order by exists (select 1 from game_categories gc where gc.game_id = p_game and gc.category_id = c.id),
               random()
      limit 1;
    end if;

    exit when v_cat_id is null;
    v_col := v_col + 1;
    v_used := v_used || v_cat_id;

    insert into game_categories (game_id, round, col, category_id, name)
    values (p_game, p_round, v_col, v_cat_id, v_cat_name);

    for d in 1 .. 4 loop
      v_qid := null;
      begin
        v_qid := (v_slot -> 'questions' ->> (d - 1))::uuid;
      exception when others then
        v_qid := null;
      end;
      insert into game_cells (game_id, round, col, difficulty, points, question, answer)
      select p_game, p_round, v_col, d, v_points[d] * v_mult, q.question, q.answer
      from questions q
      where q.category_id = v_cat_id and q.difficulty = d
      order by (q.id = v_qid) desc nulls last, random()
      limit 1;
    end loop;
  end loop;

  if v_col = 0 then
    raise exception 'Es gibt keine Kategorie mit Fragen für alle Punktstufen.';
  end if;
end $$;

revoke execute on function public._category_complete(uuid) from public, anon, authenticated;
revoke execute on function public._build_round(uuid, int) from public, anon, authenticated;
