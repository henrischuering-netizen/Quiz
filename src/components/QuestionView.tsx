import { useEffect, useState } from "react";
import { api, currentTurn, type GameState, type QueueEntry } from "@/lib/api";
import { inputClass, primaryButton, secondaryButton } from "./ui";

type Props = {
  state: GameState;
  /** Führt eine Aktion aus, zeigt Fehler an und lädt den Spielstand neu. */
  act: (action: () => Promise<unknown>) => Promise<void>;
};

export default function QuestionView({ state, act }: Props) {
  const active = state.active;
  if (!active) return null;

  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-2xl bg-tile/60 p-6 text-center sm:p-10">
      <div className="text-lg font-semibold uppercase tracking-widest text-white/70">
        {active.category} · <span className="text-gold">{active.points}</span>
      </div>
      <p className="max-w-4xl text-3xl font-extrabold leading-tight sm:text-5xl">{active.question}</p>

      {active.answer && (
        <p
          className={`rounded-xl px-6 py-4 text-2xl font-bold sm:text-3xl ${
            state.answer_visible ? "bg-stage/60 text-gold" : "border border-dashed border-gold/50 text-gold/80"
          }`}
        >
          {!state.answer_visible && <span className="block text-xs font-semibold uppercase text-white/50">Lösung (nur du siehst sie)</span>}
          {active.answer}
        </p>
      )}

      <Queue queue={active.queue} turn={currentTurn(state)} mode={state.mode} />

      {state.is_host ? (
        <HostControls state={state} act={act} />
      ) : (
        <PlayerControls key={active.id} state={state} act={act} />
      )}
    </div>
  );
}

function Queue({ queue, turn, mode }: { queue: QueueEntry[]; turn?: QueueEntry; mode: GameState["mode"] }) {
  if (queue.length === 0) return null;
  return (
    <ol className="flex w-full max-w-xl flex-col gap-1 text-left">
      {queue.map((q, i) => {
        const isTurn = q === turn;
        return (
          <li
            key={q.user_id}
            className={`flex items-center justify-between gap-3 rounded-lg px-4 py-2 ${
              isTurn ? "bg-gold/20 font-bold" : q.result === "wrong" ? "text-white/40 line-through" : "bg-stage/40"
            }`}
          >
            <span>
              {i + 1}. {q.username}
              {q.answer_text && <span className="ml-2 font-normal text-white/80 no-underline">„{q.answer_text}“</span>}
            </span>
            <span className="text-sm">
              {q.result === "correct" && "✓ richtig"}
              {q.result === "wrong" && "✗ falsch"}
              {isTurn && (mode === "voice" ? "ist dran" : q.answered ? "hat geantwortet" : "tippt…")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function HostControls({ state, act }: Props) {
  const turn = currentTurn(state);
  const gameId = state.id;
  const points = state.active?.points ?? 0;
  const waitingForText = state.mode === "text" && turn && !turn.answered;

  if (state.resolved) {
    return (
      <button type="button" className={`${primaryButton} px-6 py-3 text-lg`} onClick={() => act(() => api.closeCell(gameId))}>
        Zurück zum Board
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="min-h-8 text-xl font-semibold">
        {!turn && <span className="text-white/70">Warte auf Buzzer…</span>}
        {turn && (
          <span className="text-gold">
            {turn.username} ist dran
            {state.mode === "voice" && " – hör dir die Antwort an"}
            {waitingForText && " – tippt gerade"}
          </span>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {turn && (
          <>
            <button
              type="button"
              disabled={Boolean(waitingForText)}
              onClick={() => act(() => api.judge(gameId, true))}
              className="rounded-xl bg-green-500 px-6 py-3 text-lg font-bold text-stage hover:brightness-110 disabled:opacity-40"
            >
              Richtig (+{points})
            </button>
            <button
              type="button"
              onClick={() => act(() => api.judge(gameId, false))}
              className="rounded-xl bg-red-500 px-6 py-3 text-lg font-bold text-white hover:brightness-110"
            >
              {waitingForText ? "Überspringen" : "Falsch"} (−{points / 2})
            </button>
          </>
        )}
        <button type="button" className={`${secondaryButton} py-3`} onClick={() => act(() => api.reveal(gameId))}>
          Auflösen (keine Punkte)
        </button>
      </div>
    </div>
  );
}

function PlayerControls({ state, act }: Props) {
  const gameId = state.id;
  const queue = state.active?.queue ?? [];
  const mine = queue.find((q) => q.user_id === state.me);
  const turn = currentTurn(state);
  const canBuzz = !state.resolved && !mine;
  const [text, setText] = useState("");

  useEffect(() => {
    if (!canBuzz) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea")) return;
      e.preventDefault();
      act(() => api.buzz(gameId));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canBuzz, gameId, act]);

  if (state.resolved) return null;

  if (canBuzz) {
    return (
      <button
        type="button"
        onClick={() => act(() => api.buzz(gameId))}
        className="h-40 w-40 rounded-full bg-red-600 text-2xl font-extrabold text-white shadow-[0_8px_0_#7f1d1d] transition active:translate-y-2 active:shadow-[0_2px_0_#7f1d1d] sm:h-48 sm:w-48"
      >
        BUZZ!
        <span className="block text-xs font-semibold opacity-70">oder Leertaste</span>
      </button>
    );
  }

  if (mine?.result === "wrong") return <p className="text-xl text-red-300">Leider falsch. Die anderen sind dran.</p>;

  if (turn?.user_id === state.me) {
    if (state.mode === "voice") {
      return <p className="text-2xl font-bold text-gold">Du bist dran! Sag deine Antwort im Sprachchat.</p>;
    }
    if (mine?.answered) {
      return <p className="text-xl text-white/80">Antwort abgeschickt – warte auf die Bewertung.</p>;
    }
    return (
      <form
        className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) act(() => api.submitAnswer(gameId, text));
        }}
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder="Deine Antwort"
          className={`${inputClass} text-lg`}
        />
        <button type="submit" className={`${primaryButton} px-6 text-lg`}>
          Antworten
        </button>
      </form>
    );
  }

  const pending = queue.filter((q) => q.result === null);
  const place = pending.findIndex((q) => q.user_id === state.me);
  return (
    <p className="text-xl text-white/80">
      Du bist in der Warteschlange{place > 0 && ` auf Platz ${place + 1}`}. {turn && `${turn.username} ist gerade dran.`}
    </p>
  );
}
