import { useState } from "react";
import {
  CATEGORIES_PER_ROUND,
  DEFAULT_KEYS,
  MAX_PLAYERS,
  RESERVED_KEYS,
  TOTAL_ROUNDS,
  keyLabel,
  playableCategoryCount,
  type Player,
} from "@/lib/game";
import type { QuestionPool } from "@/lib/questions";

type Draft = { id: string; name: string; key: string };

type Props = {
  pool: QuestionPool | null;
  poolError: string | null;
  onStart: (players: Player[]) => void;
};

function newDraft(index: number, taken: string[]): Draft {
  const key = DEFAULT_KEYS.find((k) => !taken.includes(k)) ?? "";
  return { id: crypto.randomUUID(), name: `Spieler ${index + 1}`, key };
}

export default function SetupScreen({ pool, poolError, onStart }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    const first = newDraft(0, []);
    return [first, newDraft(1, [first.key])];
  });
  const [capturing, setCapturing] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const playable = pool ? playableCategoryCount(pool) : 0;
  const keys = drafts.map((d) => d.key);
  const problems = [
    drafts.length === 0 && "Mindestens ein Spieler wird gebraucht.",
    drafts.some((d) => !d.name.trim()) && "Jeder Spieler braucht einen Namen.",
    drafts.some((d) => !d.key) && "Jeder Spieler braucht eine Buzzer-Taste.",
    new Set(keys).size !== keys.length && "Jede Buzzer-Taste darf nur einmal vergeben sein.",
    pool && playable === 0 && "Keine Kategorie hat Fragen für alle Punktstufen.",
  ].filter(Boolean) as string[];

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function captureKey(id: string, e: React.KeyboardEvent) {
    e.preventDefault();
    const key = e.key.toLowerCase();
    if (key === "tab") return setCapturing(null);
    if (RESERVED_KEYS.includes(key)) {
      setKeyError(`„${keyLabel(e.key)}“ ist für den Gamemaster reserviert (R, F, Leertaste, Enter, Esc).`);
      return;
    }
    if (drafts.some((d) => d.id !== id && d.key === key)) {
      setKeyError(`„${keyLabel(key)}“ ist schon vergeben.`);
      return;
    }
    setKeyError(null);
    update(id, { key });
    setCapturing(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <section className="rounded-2xl bg-panel p-6">
        <h2 className="mb-4 text-2xl font-extrabold">Spieler</h2>
        <ul className="flex flex-col gap-3">
          {drafts.map((d) => (
            <li key={d.id} className="flex items-center gap-3">
              <input
                value={d.name}
                onChange={(e) => update(d.id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-lg bg-stage px-3 py-2 outline-none ring-gold focus:ring-2"
                aria-label="Spielername"
              />
              <button
                type="button"
                onClick={() => setCapturing(d.id)}
                onKeyDown={(e) => capturing === d.id && captureKey(d.id, e)}
                onBlur={() => capturing === d.id && setCapturing(null)}
                className={`w-40 rounded-lg px-3 py-2 text-sm font-semibold ${
                  capturing === d.id ? "bg-gold text-stage" : "bg-stage hover:bg-white/10"
                }`}
              >
                {capturing === d.id ? "Taste drücken…" : `Buzzer: ${d.key ? keyLabel(d.key) : "–"}`}
              </button>
              <button
                type="button"
                onClick={() => setDrafts((ds) => ds.filter((x) => x.id !== d.id))}
                className="rounded-lg px-3 py-2 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label={`${d.name} entfernen`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        {keyError && <p className="mt-3 text-sm text-red-300">{keyError}</p>}
        {drafts.length < MAX_PLAYERS && (
          <button
            type="button"
            onClick={() => setDrafts((ds) => [...ds, newDraft(ds.length, ds.map((d) => d.key))])}
            className="mt-4 rounded-lg border border-dashed border-white/30 px-4 py-2 text-sm hover:bg-white/10"
          >
            + Spieler hinzufügen
          </button>
        )}
      </section>

      <section className="rounded-2xl bg-panel p-6 text-sm text-white/80">
        <h2 className="mb-2 text-lg font-bold text-white">Fragen</h2>
        {poolError && <p className="text-red-300">Fragen konnten nicht geladen werden: {poolError}</p>}
        {!pool && !poolError && <p>Lade Fragen…</p>}
        {pool && (
          <>
            <p>
              {playable} spielbare Kategorien
              {pool.source === "sample" ? " (Beispielfragen, Supabase ist nicht verbunden)" : " aus Supabase"}.
            </p>
            {playable < CATEGORIES_PER_ROUND * TOTAL_ROUNDS && playable > 0 && (
              <p className="mt-1 text-gold">
                Für {TOTAL_ROUNDS} Runden mit je {CATEGORIES_PER_ROUND} neuen Kategorien braucht es{" "}
                {CATEGORIES_PER_ROUND * TOTAL_ROUNDS}. Es werden Kategorien wiederholt oder weniger Spalten gezeigt.
              </p>
            )}
          </>
        )}
        <p className="mt-3 text-white/60">
          Steuerung: Spieler buzzern mit ihrer Taste (oder Klick auf ihr Feld). Gamemaster: R = richtig,
          F = falsch, Leertaste = Antwort auflösen, Enter = zurück zum Board.
        </p>
      </section>

      {problems.length > 0 && (
        <ul className="text-sm text-red-300">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={!pool || problems.length > 0}
        onClick={() => onStart(drafts.map((d) => ({ ...d, name: d.name.trim(), score: 0 })))}
        className="rounded-xl bg-gold px-8 py-4 text-xl font-bold text-stage transition hover:brightness-110 disabled:opacity-40"
      >
        Spiel starten
      </button>
    </div>
  );
}
