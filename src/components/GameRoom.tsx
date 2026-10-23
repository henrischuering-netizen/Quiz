"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AppHeader from "./AppHeader";
import Board from "./Board";
import BoardPlanner from "./BoardPlanner";
import Lobby, { InviteFriends } from "./Lobby";
import QuestionView from "./QuestionView";
import Scoreboard from "./Scoreboard";
import { errorMessage, primaryButton, secondaryButton } from "./ui";
import { useGame } from "@/hooks/useGame";
import { api, currentTurn } from "@/lib/api";
import { ROUND_MULTIPLIER, TOTAL_ROUNDS } from "@/lib/game";
import { playBuzz } from "@/lib/sound";

export default function GameRoom({ id }: { id: string }) {
  const { state, error, reload } = useGame(id);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = useCallback(
    async (action: () => Promise<unknown>) => {
      setActionError(null);
      try {
        await action();
      } catch (e) {
        setActionError(errorMessage(e));
      }
      await reload();
    },
    [reload],
  );

  // Ton, sobald jemand neu in die Buzzer-Schlange kommt
  const queueLength = state?.active?.queue.length ?? 0;
  const lastQueueLength = useRef(0);
  useEffect(() => {
    if (queueLength > lastQueueLength.current) playBuzz();
    lastQueueLength.current = queueLength;
  }, [queueLength]);

  if (!state) {
    return (
      <main className="flex min-h-dvh flex-col gap-6 p-4 sm:p-6">
        <AppHeader />
        {error ? (
          <div className="rounded-2xl bg-panel p-6">
            <p className="mb-4 text-red-300">{error}</p>
            <Link href="/" className={primaryButton}>
              Zum Dashboard
            </Link>
          </div>
        ) : (
          <p className="text-white/60">Lade Spiel…</p>
        )}
      </main>
    );
  }

  const multiplier = ROUND_MULTIPLIER[state.round - 1] ?? 1;
  const ranking = [...state.players].sort((a, b) => b.score - a.score);
  const winners = ranking.filter((p) => p.score === ranking[0]?.score);
  const inGame = state.status !== "lobby" && state.status !== "finished";

  return (
    <main className={`flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 ${state.status === "board" ? "h-dvh min-h-[32rem]" : "min-h-dvh"}`}>
      <AppHeader>
        {inGame && (
          <span className="font-semibold text-white/70">
            Runde {state.round} von {TOTAL_ROUNDS}
            {multiplier > 1 && ` · Punkte ×${multiplier}`} · {state.mode === "text" ? "Text" : "Sprache"} ·{" "}
            <span className="font-mono">{state.code}</span>
          </span>
        )}
        {state.is_host && state.status !== "finished" && (
          <button
            type="button"
            className="rounded-lg border border-red-400/40 px-3 py-1.5 text-red-300 hover:bg-red-950/50"
            onClick={() => confirm("Spiel für alle beenden?") && act(() => api.endGame(state.id))}
          >
            Spiel beenden
          </button>
        )}
      </AppHeader>

      {(actionError || error) && (
        <p className="rounded-lg bg-red-950/60 p-3 text-sm text-red-300">{actionError ?? error}</p>
      )}

      {state.status === "lobby" && <Lobby state={state} act={act} />}

      {state.status === "board" && (
        <div className="min-h-0 flex-1">
          <Board
            categories={state.categories}
            cells={state.cells}
            onOpen={state.is_host ? (cellId) => act(() => api.openCell(state.id, cellId)) : undefined}
          />
        </div>
      )}
      {state.status === "board" && !state.is_host && (
        <p className="text-center text-white/60">{state.host.username} wählt die nächste Frage…</p>
      )}

      {state.status === "question" && <QuestionView state={state} act={act} />}

      {state.status === "round_end" && (
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <h2 className="text-4xl font-extrabold">Runde {state.round} ist vorbei!</h2>
          <p className="text-lg text-white/70">
            In Runde {state.round + 1} gibt es neue Kategorien und doppelte Punkte.
          </p>
          {state.is_host ? (
            <>
              <section className="w-full max-w-6xl rounded-2xl bg-panel p-6 text-left">
                <h3 className="mb-4 font-bold">Board für Runde {state.round + 1} festlegen</h3>
                <BoardPlanner
                  gameId={state.id}
                  rounds={[state.round + 1]}
                  playedNames={state.categories.map((c) => c.name)}
                />
              </section>
              <button type="button" className={`${primaryButton} px-8 py-4 text-xl`} onClick={() => act(() => api.nextRound(state.id))}>
                Runde {state.round + 1} starten
              </button>
            </>
          ) : (
            <p className="text-white/80">Warte auf {state.host.username}…</p>
          )}
        </div>
      )}

      {state.status === "finished" && (
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <h2 className="text-5xl font-extrabold text-gold">
            {ranking.length === 0 ? "Spiel beendet" : winners.length === 1 ? `${winners[0].username} gewinnt!` : "Unentschieden!"}
          </h2>
          <ol className="flex flex-col gap-2 text-xl">
            {ranking.map((p, i) => (
              <li key={p.user_id}>
                {i + 1}. {p.username}: <span className="font-bold">{p.score}</span>
              </li>
            ))}
          </ol>
          <Link href="/" className={`${primaryButton} px-8 py-4 text-xl`}>
            Zum Dashboard
          </Link>
        </div>
      )}

      {inGame && (
        <footer className="mt-auto flex flex-col items-center gap-3">
          <Scoreboard
            players={state.players}
            me={state.me}
            queue={state.active?.queue}
            turnUserId={currentTurn(state)?.user_id}
          />
          {state.is_host && state.status !== "question" && (
            <details className="w-full max-w-md text-sm">
              <summary className={`${secondaryButton} cursor-pointer list-none px-3 py-1 text-center`}>
                Weitere Freunde einladen
              </summary>
              <div className="mt-2 rounded-xl bg-panel p-4">
                <InviteFriends state={state} act={act} />
              </div>
            </details>
          )}
        </footer>
      )}
    </main>
  );
}
