# Quiz Grid

Quiz-Spiel im Jeopardy-Stil für einen PC (am besten an Beamer oder TV). Oben stehen die Kategorien, darunter die Punktwerte 100 / 200 / 300 / 500. Der Gamemaster wählt eine Frage, die Spieler buzzern mit ihrer eigenen Taste. Richtig gibt die Punkte, falsch zieht die Hälfte ab, und die anderen dürfen nachbuzzern. Ist das Grid leer, folgt Runde 2 mit neuen Kategorien und doppelten Punkten.

## Steuerung

| Wer | Taste | Aktion |
| --- | --- | --- |
| Spieler | eigene Taste (Standard A, L, Q, P, Z, M) oder Klick aufs Spielerfeld | buzzern |
| Gamemaster | R | richtig |
| Gamemaster | F | falsch |
| Gamemaster | Leertaste | Antwort auflösen (keine Punkte) |
| Gamemaster | Enter / Esc | zurück zum Board |

Mit der Maus über einem Spielerfeld erscheinen ±100-Knöpfe für Korrekturen. Der Spielstand wird im Browser gespeichert und übersteht ein Neuladen.

## Lokal starten

```bash
npm install
npm run dev
```

Dann <http://localhost:3000> öffnen. Ohne Supabase nutzt das Spiel die eingebauten Beispielfragen aus `src/lib/sampleQuestions.ts`.

## Supabase einrichten

1. Auf <https://supabase.com> ein Projekt anlegen.
2. Im **SQL Editor** zuerst `supabase/migrations/001_init.sql` und danach `supabase/seed.sql` (Beispielfragen) ausführen.
3. Unter **Project Settings → API** die Project URL und den `anon`-Key kopieren.
4. `.env.example` nach `.env.local` kopieren und die Werte eintragen, dann `npm run dev` neu starten.

Fragen pflegst du danach unter `/admin`. Jede Kategorie braucht mindestens eine Frage pro Punktstufe, sonst taucht sie nicht im Spiel auf. Gibt es mehrere Fragen pro Stufe, wird zufällig eine gewählt. Für zwei Runden ohne Wiederholung braucht es 10 vollständige Kategorien.

> **Hinweis:** In dieser ersten Version darf jeder mit dem Link Fragen unter `/admin` bearbeiten (RLS erlaubt Schreiben für `anon`). Bevor die Seite öffentlich ist, sollte `/admin` mit Supabase Auth abgesichert und die Schreib-Policies auf eingeloggte Nutzer beschränkt werden.

## Auf Vercel deployen

1. Projekt in ein GitHub-Repository pushen.
2. Auf <https://vercel.com> „Add New → Project“, das Repository importieren (Framework: Next.js wird erkannt).
3. Unter **Environment Variables** `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` setzen und deployen.

## Anpassen

In `src/lib/game.ts`:

- `BASE_POINTS`: Punktwerte der Zeilen (für eine 400er-Zeile ergänzen und in der Migration `difficulty between 1 and 5` erlauben).
- `CATEGORIES_PER_ROUND`: Spalten pro Runde.
- `ROUND_MULTIPLIER`: Anzahl der Runden und Punkte-Multiplikator je Runde.

Nach Änderungen an `src/lib/sampleQuestions.ts` erzeugt `npm run seed:sql` die `supabase/seed.sql` neu.
