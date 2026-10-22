import { useEffect, type Dispatch } from "react";
import type { GameAction, GameState } from "@/lib/game";

/**
 * Tastatursteuerung während einer Frage:
 * Spieler-Tasten buzzern, R = richtig, F = falsch, Leertaste = Antwort zeigen,
 * Enter/Escape = zurück zum Board (sobald die Frage entschieden ist).
 */
export function useGameKeys(state: GameState, dispatch: Dispatch<GameAction>) {
  useEffect(() => {
    if (state.phase !== "question") return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;

      const key = e.key.toLowerCase();
      const player = state.players.find((p) => p.key === key);
      if (player) {
        dispatch({ type: "BUZZ", playerId: player.id });
      } else if (key === "r" && state.buzzedPlayerId) {
        dispatch({ type: "JUDGE", correct: true });
      } else if (key === "f" && state.buzzedPlayerId) {
        dispatch({ type: "JUDGE", correct: false });
      } else if (key === " " && !state.resolved && !state.buzzedPlayerId) {
        dispatch({ type: "REVEAL" });
      } else if ((key === "enter" || key === "escape") && state.resolved) {
        dispatch({ type: "CLOSE_CELL" });
      } else {
        return;
      }
      e.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.phase, state.players, state.buzzedPlayerId, state.resolved, dispatch]);
}
