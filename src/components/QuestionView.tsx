import type { Dispatch } from "react";
import { activeCell, type GameAction, type GameState } from "@/lib/game";

type Props = { state: GameState; dispatch: Dispatch<GameAction> };

export default function QuestionView({ state, dispatch }: Props) {
  const cell = activeCell(state);
  if (!cell) return null;
  const category = state.categories.find((c) => c.id === cell.categoryId);
  const buzzed = state.players.find((p) => p.id === state.buzzedPlayerId);
  const nobodyLeft = !state.resolved && !state.buzzerOpen && !buzzed;

  return (
    <div className="flex w-full flex-col items-center gap-8 rounded-2xl bg-tile/60 p-6 text-center sm:p-12">
      <div className="text-lg font-semibold uppercase tracking-widest text-white/70">
        {category?.name} · <span className="text-gold">{cell.points}</span>
      </div>

      <p className="max-w-4xl text-3xl font-extrabold leading-tight sm:text-5xl">{cell.question}</p>

      {state.answerVisible && (
        <p className="rounded-xl bg-stage/60 px-6 py-4 text-2xl font-bold text-gold sm:text-3xl">
          {cell.answer}
        </p>
      )}

      <div className="min-h-10 text-xl font-semibold">
        {buzzed && (
          <span className="text-gold">
            {buzzed.name} ist dran! (+{cell.points} / −{Math.round(cell.points / 2)})
          </span>
        )}
        {state.buzzerOpen && <span className="text-white/80">Buzzer offen – drückt eure Taste!</span>}
        {nobodyLeft && <span className="text-red-300">Niemand mehr übrig. Antwort auflösen?</span>}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {buzzed && (
          <>
            <button
              type="button"
              onClick={() => dispatch({ type: "JUDGE", correct: true })}
              className="rounded-xl bg-green-500 px-6 py-3 text-lg font-bold text-stage hover:brightness-110"
            >
              Richtig <kbd className="ml-1 text-sm opacity-70">R</kbd>
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "JUDGE", correct: false })}
              className="rounded-xl bg-red-500 px-6 py-3 text-lg font-bold text-white hover:brightness-110"
            >
              Falsch <kbd className="ml-1 text-sm opacity-70">F</kbd>
            </button>
          </>
        )}
        {!state.resolved && !buzzed && (
          <button
            type="button"
            onClick={() => dispatch({ type: "REVEAL" })}
            className="rounded-xl border border-white/30 px-6 py-3 text-lg font-semibold hover:bg-white/10"
          >
            Antwort auflösen <kbd className="ml-1 text-sm opacity-70">Leertaste</kbd>
          </button>
        )}
        {state.resolved && (
          <button
            type="button"
            onClick={() => dispatch({ type: "CLOSE_CELL" })}
            className="rounded-xl bg-gold px-6 py-3 text-lg font-bold text-stage hover:brightness-110"
          >
            Zurück zum Board <kbd className="ml-1 text-sm opacity-70">Enter</kbd>
          </button>
        )}
      </div>
    </div>
  );
}
