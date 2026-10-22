"use client";

import { useEffect, useState } from "react";
import { BASE_POINTS } from "@/lib/game";
import {
  createCategory,
  deleteCategory,
  deleteQuestion,
  loadQuestionPool,
  renameCategory,
  saveQuestion,
  type Category,
  type Question,
} from "@/lib/questions";
import { isSupabaseConfigured } from "@/lib/supabase";

const input = "w-full rounded-lg bg-stage px-3 py-2 outline-none ring-gold focus:ring-2";

function errorText(e: unknown): string {
  const message =
    e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : String(e);
  return message.includes("row-level security")
    ? "Keine Berechtigung. Ist dein Account als Admin eingetragen?"
    : message;
}

export default function AdminEditor() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    loadQuestionPool()
      .then((pool) => {
        setCategories(pool.categories);
        setQuestions(pool.questions);
        setSelectedId(pool.categories[0]?.id ?? null);
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-2xl bg-panel p-6 text-white/80">
        <h2 className="mb-2 text-xl font-bold text-white">Supabase ist noch nicht verbunden</h2>
        <p>
          Lege im Projektordner eine Datei <code>.env.local</code> an (Vorlage: <code>.env.example</code>) und
          trage <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ein. Danach
          den Dev-Server neu starten. Bis dahin nutzt das Spiel die eingebauten Beispielfragen.
        </p>
      </div>
    );
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    }
  }

  const selected = categories.find((c) => c.id === selectedId);
  const complete = (id: string) =>
    BASE_POINTS.every((_, i) => questions.some((q) => q.category_id === id && q.difficulty === i + 1));

  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
      <aside className="flex flex-col gap-3 rounded-2xl bg-panel p-4">
        <h2 className="font-bold">Kategorien</h2>
        {loading && <p className="text-sm text-white/60">Lade…</p>}
        <ul className="flex flex-col gap-1">
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  c.id === selectedId ? "bg-tile" : "hover:bg-white/10"
                }`}
              >
                <span>{c.name}</span>
                {!complete(c.id) && (
                  <span className="text-xs text-gold" title="Nicht für jede Punktstufe gibt es eine Frage">
                    unvollständig
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newCategory.trim();
            if (!name) return;
            run(async () => {
              const c = await createCategory(name);
              setCategories((cs) => [...cs, c].sort((a, b) => a.name.localeCompare(b.name)));
              setSelectedId(c.id);
              setNewCategory("");
            });
          }}
        >
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Neue Kategorie"
            className={input}
          />
          <button type="submit" className="rounded-lg bg-gold px-3 font-bold text-stage">
            +
          </button>
        </form>
      </aside>

      <section className="flex flex-col gap-4">
        {error && <p className="rounded-lg bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
        {selected ? (
          <>
            <div className="flex items-center gap-3">
              <input
                key={selected.id}
                defaultValue={selected.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (!name || name === selected.name) return;
                  run(async () => {
                    await renameCategory(selected.id, name);
                    setCategories((cs) => cs.map((c) => (c.id === selected.id ? { ...c, name } : c)));
                  });
                }}
                className={`${input} text-xl font-bold`}
                aria-label="Kategoriename"
              />
              <button
                type="button"
                onClick={() =>
                  confirm(`Kategorie „${selected.name}“ mit allen Fragen löschen?`) &&
                  run(async () => {
                    await deleteCategory(selected.id);
                    setCategories((cs) => cs.filter((c) => c.id !== selected.id));
                    setQuestions((qs) => qs.filter((q) => q.category_id !== selected.id));
                    setSelectedId(null);
                  })
                }
                className="shrink-0 rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-300 hover:bg-red-950/50"
              >
                Kategorie löschen
              </button>
            </div>

            {BASE_POINTS.map((points, i) => {
              const difficulty = i + 1;
              const list = questions.filter(
                (q) => q.category_id === selected.id && q.difficulty === difficulty,
              );
              return (
                <div key={difficulty} className="rounded-2xl bg-panel p-4">
                  <h3 className="mb-3 font-bold">
                    <span className="text-gold">{points}</span>{" "}
                    <span className="text-sm font-normal text-white/60">
                      (Runde 2: {points * 2}) · {list.length} Frage{list.length === 1 ? "" : "n"}
                    </span>
                  </h3>
                  <div className="flex flex-col gap-3">
                    {list.map((q) => (
                      <QuestionForm
                        key={q.id}
                        initial={q}
                        onSave={(question, answer) =>
                          run(async () => {
                            const saved = await saveQuestion({ ...q, question, answer });
                            setQuestions((qs) => qs.map((x) => (x.id === q.id ? saved : x)));
                          })
                        }
                        onDelete={() =>
                          run(async () => {
                            await deleteQuestion(q.id);
                            setQuestions((qs) => qs.filter((x) => x.id !== q.id));
                          })
                        }
                      />
                    ))}
                    <QuestionForm
                      key={`new-${selected.id}-${difficulty}-${list.length}`}
                      onSave={(question, answer) =>
                        run(async () => {
                          const saved = await saveQuestion({
                            category_id: selected.id,
                            difficulty,
                            question,
                            answer,
                          });
                          setQuestions((qs) => [...qs, saved]);
                        })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          !loading && <p className="text-white/60">Wähle links eine Kategorie oder lege eine neue an.</p>
        )}
      </section>
    </div>
  );
}

function QuestionForm({
  initial,
  onSave,
  onDelete,
}: {
  initial?: Question;
  onSave: (question: string, answer: string) => void;
  onDelete?: () => void;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const dirty = question !== (initial?.question ?? "") || answer !== (initial?.answer ?? "");
  const valid = question.trim() && answer.trim();

  return (
    <form
      className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(question.trim(), answer.trim());
      }}
    >
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={initial ? "Frage" : "Neue Frage"}
        className={input}
      />
      <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Antwort" className={input} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!dirty || !valid}
          className="rounded-lg bg-gold px-3 py-2 text-sm font-bold text-stage disabled:opacity-30"
        >
          {initial ? "Speichern" : "Hinzufügen"}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/10 hover:text-red-300"
            aria-label="Frage löschen"
          >
            ✕
          </button>
        )}
      </div>
    </form>
  );
}
