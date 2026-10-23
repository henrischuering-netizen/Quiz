"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type GameSetup, type SetupSlot } from "@/lib/api";
import { BASE_POINTS, CATEGORIES_PER_ROUND, ROUND_MULTIPLIER, TOTAL_ROUNDS } from "@/lib/game";
import { loadQuestionCatalog, type Category, type QuestionSummary } from "@/lib/questions";
import { errorMessage, secondaryButton } from "./ui";

type Props = {
  gameId: string;
  /** Welche Runden (1-basiert) noch geplant werden können */
  rounds: number[];
  /** Namen schon gespielter Kategorien, die beim Würfeln gemieden werden */
  playedNames?: string[];
};

type Catalog = { categories: Category[]; questions: QuestionSummary[] };

const emptySlot = (): SetupSlot => ({ category_id: null, questions: BASE_POINTS.map(() => null) });
const emptyRound = () => Array.from({ length: CATEGORIES_PER_ROUND }, emptySlot);

function normalize(setup: GameSetup | null): GameSetup {
  return {
    categories_mode: setup?.categories_mode ?? "random",
    questions_mode: setup?.questions_mode ?? "random",
    rounds: Array.from({ length: TOTAL_ROUNDS }, (_, r) =>
      Array.from({ length: CATEGORIES_PER_ROUND }, (_, i) => {
        const slot = setup?.rounds?.[r]?.[i];
        return {
          category_id: slot?.category_id ?? null,
          questions: BASE_POINTS.map((_, d) => slot?.questions?.[d] ?? null),
        };
      }),
    ),
  };
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ModeSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "random" | "choose";
  onChange: (v: "random" | "choose") => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm font-semibold text-white/70">{label}</span>
      <div className="flex rounded-lg bg-stage p-1">
        {(["random", "choose"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-md px-3 py-1 text-sm font-semibold ${value === v ? "bg-gold text-stage" : "text-white/70 hover:text-white"}`}
          >
            {v === "random" ? "Zufällig" : "Selbst wählen"}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Lässt den Host Kategorien und/oder Fragen je Runde festlegen. Speichert jede Änderung sofort. */
export default function BoardPlanner({ gameId, rounds, playedNames = [] }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [setup, setSetup] = useState<GameSetup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([loadQuestionCatalog(), api.getSetup(gameId)])
      .then(([c, s]) => {
        setCatalog(c);
        setSetup(normalize(s));
      })
      .catch((e) => setError(errorMessage(e)));
  }, [gameId]);

  // Nur Kategorien mit Fragen für jede Punktstufe sind spielbar
  const complete = useMemo(
    () =>
      (catalog?.categories ?? []).filter((c) =>
        BASE_POINTS.every((_, d) => catalog!.questions.some((q) => q.category_id === c.id && q.difficulty === d + 1)),
      ),
    [catalog],
  );

  if (error) return <p className="text-sm text-red-300">{error}</p>;
  if (!catalog || !setup) return <p className="text-sm text-white/60">Lade Fragen…</p>;

  async function save(next: GameSetup) {
    setSetup(next);
    setSaved(false);
    setError(null);
    try {
      await api.setSetup(gameId, next);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  /** Füllt die Kategorien der planbaren Runden zufällig, ohne Wiederholung über die Runden. */
  function rollCategories(base: GameSetup, which: number[]): GameSetup {
    const next = structuredClone(base);
    const takenElsewhere = new Set(
      next.rounds.flatMap((slots, r) => (which.includes(r + 1) ? [] : slots.map((s) => s.category_id))),
    );
    const pool = shuffle(complete.filter((c) => !takenElsewhere.has(c.id)));
    // Schon gespielte Kategorien nur, wenn sonst nichts übrig ist
    pool.sort((a, b) => Number(playedNames.includes(a.name)) - Number(playedNames.includes(b.name)));
    for (const r of which) {
      next.rounds[r - 1] = next.rounds[r - 1].map(() => ({ ...emptySlot(), category_id: pool.shift()?.id ?? null }));
    }
    return next;
  }

  function setCategoriesMode(mode: GameSetup["categories_mode"]) {
    let next: GameSetup = { ...setup!, categories_mode: mode };
    if (mode === "random") {
      next =
        next.questions_mode === "choose"
          ? rollCategories(next, rounds)
          : { ...next, rounds: next.rounds.map((slots, r) => (rounds.includes(r + 1) ? emptyRound() : slots)) };
    }
    save(next);
  }

  function setQuestionsMode(mode: GameSetup["questions_mode"]) {
    let next: GameSetup = { ...setup!, questions_mode: mode };
    if (mode === "choose" && next.categories_mode === "random") {
      next = rollCategories(next, rounds);
    }
    if (mode === "random") {
      next = {
        ...next,
        rounds: next.rounds.map((slots, r) =>
          !rounds.includes(r + 1)
            ? slots
            : next.categories_mode === "random"
              ? emptyRound()
              : slots.map((s) => ({ ...s, questions: BASE_POINTS.map(() => null) })),
        ),
      };
    }
    save(next);
  }

  function updateSlot(round: number, index: number, slot: SetupSlot) {
    const next = structuredClone(setup!);
    next.rounds[round - 1][index] = slot;
    save(next);
  }

  const name = (id: string | null) => catalog.categories.find((c) => c.id === id)?.name ?? "?";
  const allRandom = setup.categories_mode === "random" && setup.questions_mode === "random";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ModeSwitch label="Kategorien" value={setup.categories_mode} onChange={setCategoriesMode} />
        <ModeSwitch label="Fragen" value={setup.questions_mode} onChange={setQuestionsMode} />
      </div>

      {allRandom && (
        <p className="text-sm text-white/60">Kategorien und Fragen werden beim Rundenstart zufällig gezogen.</p>
      )}

      {!allRandom &&
        rounds.map((round) => {
          const slots = setup.rounds[round - 1];
          const mult = ROUND_MULTIPLIER[round - 1] ?? 1;
          const otherRounds = new Set(
            setup.rounds.flatMap((s, r) => (r === round - 1 ? [] : s.map((x) => x.category_id))),
          );
          return (
            <div key={round} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">
                  Runde {round} <span className="text-sm font-normal text-white/60">({BASE_POINTS.map((p) => p * mult).join(" / ")})</span>
                </h3>
                {setup.categories_mode === "random" && (
                  <button
                    type="button"
                    className={`${secondaryButton} px-3 py-1 text-xs`}
                    onClick={() => save(rollCategories(setup, [round]))}
                  >
                    Kategorien neu würfeln
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {slots.map((slot, i) => (
                  <div key={i} className="flex flex-col gap-1 rounded-lg bg-stage p-2">
                    {setup.categories_mode === "choose" ? (
                      <select
                        value={slot.category_id ?? ""}
                        onChange={(e) => updateSlot(round, i, { ...emptySlot(), category_id: e.target.value || null })}
                        className="rounded bg-panel px-2 py-1 text-sm font-bold"
                        aria-label={`Runde ${round}, Spalte ${i + 1}: Kategorie`}
                      >
                        <option value="">– zufällig –</option>
                        {complete.map((c) => (
                          <option
                            key={c.id}
                            value={c.id}
                            disabled={slots.some((s, j) => j !== i && s.category_id === c.id)}
                          >
                            {c.name}
                            {otherRounds.has(c.id) ? " (andere Runde)" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-2 py-1 text-sm font-bold">{slot.category_id ? name(slot.category_id) : "– zufällig –"}</div>
                    )}

                    {setup.questions_mode === "choose" &&
                      (slot.category_id ? (
                        BASE_POINTS.map((p, d) => {
                          const options = catalog.questions.filter(
                            (q) => q.category_id === slot.category_id && q.difficulty === d + 1,
                          );
                          return (
                            <label key={d} className="flex flex-col text-xs text-white/60">
                              <span className="text-gold">{p * mult}</span>
                              <select
                                value={slot.questions[d] ?? ""}
                                onChange={(e) => {
                                  const questions = [...slot.questions];
                                  questions[d] = e.target.value || null;
                                  updateSlot(round, i, { ...slot, questions });
                                }}
                                className="w-full rounded bg-panel px-1 py-1 text-xs text-white"
                              >
                                <option value="">– zufällig ({options.length}) –</option>
                                {options.map((q) => (
                                  <option key={q.id} value={q.id}>
                                    {q.question.length > 60 ? `${q.question.slice(0, 57)}…` : q.question}
                                  </option>
                                ))}
                              </select>
                            </label>
                          );
                        })
                      ) : (
                        <p className="px-2 text-xs text-white/50">Fragen zufällig, weil die Kategorie zufällig ist.</p>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      <p className="h-4 text-xs text-white/40">{saved && "Gespeichert"}</p>
    </div>
  );
}
