-- Kategorien und Fragen für das Punkte-Grid
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- difficulty 1–4 entspricht den Zeilen 100 / 200 / 300 / 500 (Runde 2: doppelt)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  difficulty int not null check (difficulty between 1 and 4),
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create index if not exists questions_category_idx on public.questions (category_id);

alter table public.categories enable row level security;
alter table public.questions enable row level security;

-- v1: Lesen und Schreiben für alle (die Admin-Seite hat noch keinen Login).
-- Später durch Policies für authentifizierte Nutzer ersetzen.
create policy "categories lesen" on public.categories for select using (true);
create policy "categories schreiben" on public.categories for all using (true) with check (true);
create policy "questions lesen" on public.questions for select using (true);
create policy "questions schreiben" on public.questions for all using (true) with check (true);
