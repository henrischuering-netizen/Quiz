-- Nur eingetragene Admins dürfen Kategorien und Fragen ändern. Lesen bleibt öffentlich (das Spiel braucht es).
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.admins enable row level security;

-- Jeder eingeloggte Nutzer darf nur prüfen, ob er selbst Admin ist.
create policy "admins eigener eintrag" on public.admins
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists "categories schreiben" on public.categories;
drop policy if exists "questions schreiben" on public.questions;

create policy "categories einfügen" on public.categories for insert to authenticated with check (public.is_admin());
create policy "categories ändern" on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories löschen" on public.categories for delete to authenticated using (public.is_admin());

create policy "questions einfügen" on public.questions for insert to authenticated with check (public.is_admin());
create policy "questions ändern" on public.questions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "questions löschen" on public.questions for delete to authenticated using (public.is_admin());

-- Danach den eigenen Account als Admin eintragen (E-Mail anpassen):
-- insert into public.admins (user_id) select id from auth.users where email = 'deine@email.de';
