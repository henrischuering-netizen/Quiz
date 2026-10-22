"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import Board from "./Board";
import QuestionView from "./QuestionView";
import Scoreboard from "./Scoreboard";
import SetupScreen from "./SetupScreen";
import { useGameKeys } from "@/hooks/useGameKeys";
import {
  ROUND_MULTIPLIER,
  TOTAL_ROUNDS,
  buildRound,
  gameReducer,
  initialState,
  type GameState,
} from "@/lib/game";
import { loadQuestionPool, type QuestionPool } from "@/lib/questions";
import { playBuzz } from "@/lib/sound";

const STORAGE_KEY = "quiz-grid-state-v1";

function loadSaved(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initialState, ...JSON.parse(raw) };
  } catch {
    // kein gespeicherter Spielstand
  }
  return initialState;
}

export default function GameApp() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadSaved);
  const [pool, setPool] = useState<QuestionPool | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestionPool()
      .then(setPool)
      .catch((e: unknown) => setPoolError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Speichern ist optional
    }
  }, [state]);

  useEffect(() => {
    if (state.buzzedPlayerId) playBuzz();
  }, [state.buzzedPlayerId]);

  useGameKeys(state, dispatch);

  const ranking = [...state.players].sort((a, b) => b.score - a.score);
  const topScore = ranking[0]?.score;
  const winners = ranking.filter((p) => p.score === topScore);

  return (
    <main
      className={`flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 ${
        state.phase === "board" ? "h-dvh min-h-[32rem]" : "min-h-dvh"
      }`}
    >
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-extrabold text-gold">
          Quiz Grid
        </Link>
        {state.phase !== "setup" && (
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-white/70">
              Runde {state.round} von {TOTAL_ROUNDS}
              {ROUND_MULTIPLIER[state.round - 1] > 1 && ` · Punkte ×${ROUND_MULTIPLIER[state.round - 1]}`}
            </span>
            <button
              type="button"
              onClick={() => confirm("Spiel wirklich beenden? Der Spielstand geht verloren.") && dispatch({ type: "RESET" })}
              className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10"
            >
              Spiel beenden
            </button>
          </div>
        )}
      </header>

      {state.phase === "setup" && (
        <SetupScreen
          pool={pool}
          poolError={poolError}
          onStart={(players) =>
            pool && dispatch({ type: "START", players, firstRound: buildRound(pool, 1, []) })
          }
        />
      )}

      {state.phase === "board" && (
        <div className="min-h-0 flex-1">
          <Board
            categories={state.categories}
            cells={state.cells}
            onOpen={(cellId) => dispatch({ type: "OPEN_CELL", cellId })}
          />
        </div>
      )}

      {state.phase === "question" && <QuestionView state={state} dispatch={dispatch} />}

      {state.phase === "roundEnd" && (
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <h2 className="text-4xl font-extrabold">Runde {state.round} ist vorbei!</h2>
          <p className="text-lg text-white/70">
            In Runde {state.round + 1} gibt es neue Kategorien und{" "}
            {ROUND_MULTIPLIER[state.round] / ROUND_MULTIPLIER[state.round - 1]}× so viele Punkte.
          </p>
          {poolError && <p className="text-red-300">Fragen konnten nicht geladen werden: {poolError}</p>}
          <button
            type="button"
            disabled={!pool}
            onClick={() =>
              pool &&
              dispatch({
                type: "NEXT_ROUND",
                nextRound: buildRound(pool, state.round + 1, state.usedCategoryIds),
              })
            }
            className="rounded-xl bg-gold px-8 py-4 text-xl font-bold text-stage hover:brightness-110 disabled:opacity-40"
          >
            Runde {state.round + 1} starten
          </button>
        </div>
      )}

      {state.phase === "finished" && (
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <h2 className="text-5xl font-extrabold text-gold">
            {winners.length === 1 ? `${winners[0].name} gewinnt!` : "Unentschieden!"}
          </h2>
          <ol className="flex flex-col gap-2 text-xl">
            {ranking.map((p, i) => (
              <li key={p.id}>
                {i + 1}. {p.name}: <span className="font-bold">{p.score}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => dispatch({ type: "RESET" })}
            className="rounded-xl bg-gold px-8 py-4 text-xl font-bold text-stage hover:brightness-110"
          >
            Neues Spiel
          </button>
        </div>
      )}

      {state.phase !== "setup" && state.phase !== "finished" && (
        <footer className="mt-auto">
          <Scoreboard
            players={state.players}
            buzzedPlayerId={state.buzzedPlayerId}
            lockedOut={state.lockedOut}
            onBuzz={
              state.phase === "question" ? (playerId) => dispatch({ type: "BUZZ", playerId }) : undefined
            }
            onAdjust={(playerId, delta) => dispatch({ type: "ADJUST_SCORE", playerId, delta })}
          />
        </footer>
      )}
    </main>
  );
}
