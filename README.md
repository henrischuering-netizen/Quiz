# Quiz Grid

Online-Quiz im Jeopardy-Stil. Jeder spielt an seinem eigenen Gerät. Oben stehen die Kategorien, darunter die Punktwerte 100 / 200 / 300 / 500. Der Host wählt eine Frage, die Spieler buzzern. Richtig gibt die Punkte, falsch zieht die Hälfte ab. Ist das Grid leer, folgt Runde 2 mit neuen Kategorien und doppelten Punkten.

## So läuft ein Spiel

1. **Registrieren** mit E-Mail, Passwort und Benutzername.
2. **Freunde hinzufügen:** Im Dashboard den Benutzernamen eintragen. Der andere nimmt die Anfrage an.
3. **Lobby erstellen** und den Modus wählen:
   - **Textmodus:** Wer dran ist, tippt seine Antwort. Der Host sieht sie und entscheidet Richtig oder Falsch.
   - **Sprachmodus:** Kein Textfeld. Die Antwort wird im Sprachchat (z. B. Discord) gesagt, der Host bewertet per Klick.
4. **Freunde einladen** (die Einladung erscheint in ihrem Dashboard) oder den 6-stelligen Code teilen.
5. **Spielen:** Der Host öffnet eine Frage. Alle können buzzern (Knopf oder Leertaste) und landen in einer Warteschlange. Der Schnellste ist dran. Ist seine Antwort falsch, ist automatisch der Nächste dran. Der Host kann jederzeit auflösen (keine Punkte).

Der Host spielt nicht mit, er ist Gamemaster und sieht als Einziger die Lösung vorab.

## Lokal starten

```bash
npm install
npm run dev
```

Dann <http://localhost:3000> öffnen. Dafür braucht es eine `.env.local` mit den Supabase-Zugangsdaten (siehe unten).

## Supabase einrichten

1. Auf <https://supabase.com> ein Projekt anlegen.
2. Im **SQL Editor** nacheinander ausführen, jeweils in einem leeren Editor:
   1. `supabase/migrations/001_init.sql` (Kategorien und Fragen)
   2. `supabase/seed.sql` (Beispielfragen)
   3. `supabase/migrations/002_admin_auth.sql` (Admin-Rechte)
   4. `supabase/migrations/003_online.sql` (Accounts, Freunde, Online-Spiele)
3. **Authentication → Sign In / Providers:** „Allow new users to sign up“ einschalten. Optional „Confirm email“ ausschalten, dann entfällt die Bestätigungsmail.
4. **Authentication → URL Configuration:** als Site URL die Adresse der Seite eintragen (z. B. `https://quiz-azure-pi.vercel.app`), damit der Link in der Bestätigungsmail stimmt.
5. Unter **Project Settings → API** die Project URL und den Publishable/anon-Key kopieren, `.env.example` nach `.env.local` kopieren und die Werte eintragen.

### Fragen verwalten (Admin)

Fragen pflegst du unter `/admin`. Nur Accounts in der Tabelle `public.admins` dürfen dort etwas ändern:

```sql
insert into public.admins (user_id) select id from auth.users where email = 'deine@email.de';
```

Jede Kategorie braucht mindestens eine Frage pro Punktstufe, sonst taucht sie nicht im Spiel auf. Gibt es mehrere Fragen pro Stufe, wird zufällig eine gewählt. Für zwei Runden ohne Wiederholung braucht es 10 vollständige Kategorien.

### Sicherheit

- Die Spiel-Logik läuft in Postgres-Funktionen (`003_online.sql`). Sie prüfen, wer was darf: Nur der Host öffnet und bewertet Fragen, nur wer dran ist, darf antworten. Die Buzzer-Reihenfolge bestimmt der Server.
- Die Spalte `questions.answer` ist für Spieler nicht lesbar. Die Lösung bekommt nur der Host über `get_game_state`, alle anderen erst nach dem Auflösen.

## Auf Vercel deployen

1. Projekt in ein GitHub-Repository pushen.
2. Auf <https://vercel.com> „Add New → Project“, das Repository importieren (Framework: Next.js wird erkannt).
3. Unter **Environment Variables** `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` setzen und deployen.

## Anpassen

Punkte, Kategorien pro Runde und Rundenzahl stehen in `src/lib/game.ts` und in der Funktion `_build_round` in `supabase/migrations/003_online.sql`. Bei Änderungen beides anpassen.

Nach Änderungen an `src/lib/sampleQuestions.ts` erzeugt `npm run seed:sql` die `supabase/seed.sql` neu.
