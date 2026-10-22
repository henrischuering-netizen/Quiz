import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/components/ui";
import { api, type GameState } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";

/**
 * Lädt den Spielstand und hält ihn aktuell: Jede Aktion setzt games.updated_at,
 * darauf hören wir per Realtime. Zusätzlich alle 15 s und beim Zurückkehren in den Tab.
 */
export function useGame(id: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const n = ++seq.current;
    try {
      const s = await api.gameState(id);
      if (n === seq.current) {
        setState(s);
        setError(null);
      }
    } catch (e) {
      if (n === seq.current) setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    const db = getSupabase();
    const channel = db
      .channel(`game-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${id}` }, () =>
        reload(),
      )
      // Erstes Laden, sobald der Kanal steht (oder scheitert: dann tragen Intervall und Tab-Wechsel)
      .subscribe(() => reload());
    const interval = setInterval(reload, 15000);
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      db.removeChannel(channel);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, reload]);

  return { state, error, reload };
}
