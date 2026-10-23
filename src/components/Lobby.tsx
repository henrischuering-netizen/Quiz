import { useEffect, useState } from "react";
import BoardPlanner from "./BoardPlanner";
import { api, type Friend, type GameState } from "@/lib/api";
import { ROUND_MULTIPLIER } from "@/lib/game";
import { primaryButton, secondaryButton } from "./ui";

type Props = { state: GameState; act: (action: () => Promise<unknown>) => Promise<void> };

/** Freunde einladen; wird in der Lobby und (für Nachzügler) während des Spiels gezeigt. */
export function InviteFriends({ state, act }: Props) {
  const [friends, setFriends] = useState<Friend[] | null>(null);

  useEffect(() => {
    api
      .friends()
      .then((f) => setFriends(f.filter((x) => x.status === "friend")))
      .catch(() => setFriends([]));
  }, []);

  if (!friends) return <p className="text-sm text-white/60">Lade Freunde…</p>;
  if (friends.length === 0) {
    return <p className="text-sm text-white/60">Du hast noch keine Freunde. Füge sie im Dashboard per Benutzername hinzu oder teile den Code.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {friends.map((f) => {
        const joined = state.players.some((p) => p.user_id === f.user_id);
        const invite = state.invites?.find((i) => i.user_id === f.user_id);
        return (
          <li key={f.user_id} className="flex items-center justify-between gap-2">
            <span>{f.username}</span>
            {joined ? (
              <span className="text-sm text-green-300">ist dabei</span>
            ) : invite?.status === "pending" ? (
              <span className="text-sm text-white/60">eingeladen…</span>
            ) : (
              <button
                type="button"
                className={`${secondaryButton} px-3 py-1 text-sm`}
                onClick={() => act(() => api.invite(state.id, f.user_id))}
              >
                {invite?.status === "declined" ? "Erneut einladen" : "Einladen"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Lobby({ state, act }: Props) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-2xl bg-panel p-6">
        <div>
          <div className="text-sm text-white/60">Beitrittscode</div>
          <div className="font-mono text-5xl font-extrabold tracking-[0.2em] text-gold">{state.code}</div>
        </div>
        <p className="text-sm text-white/70">
          {state.mode === "text"
            ? "Textmodus: Wer dran ist, tippt seine Antwort."
            : "Sprachmodus: Antworten werden im Sprachchat gesagt."}{" "}
          Host: <b>{state.host.username}</b>
        </p>
        <div>
          <h2 className="mb-2 font-bold">Spieler ({state.players.length})</h2>
          {state.players.length === 0 && <p className="text-sm text-white/60">Noch niemand beigetreten.</p>}
          <ul className="flex flex-wrap gap-2">
            {state.players.map((p) => (
              <li key={p.user_id} className="rounded-lg bg-stage px-3 py-1">
                {p.username}
                {p.user_id === state.me && " (du)"}
              </li>
            ))}
          </ul>
        </div>
        {state.is_host ? (
          <button
            type="button"
            disabled={state.players.length === 0}
            onClick={() => act(() => api.start(state.id))}
            className={`${primaryButton} py-3 text-lg`}
          >
            Spiel starten
          </button>
        ) : (
          <p className="text-white/80">Warte, bis {state.host.username} das Spiel startet…</p>
        )}
      </section>

      {state.is_host && (
        <section className="rounded-2xl bg-panel p-6">
          <h2 className="mb-3 font-bold">Freunde einladen</h2>
          <InviteFriends state={state} act={act} />
        </section>
      )}

      {state.is_host && (
        <section className="rounded-2xl bg-panel p-6 md:col-span-2">
          <h2 className="mb-1 font-bold">Board festlegen</h2>
          <p className="mb-4 text-sm text-white/60">
            Nur du siehst diese Auswahl. Was auf „zufällig“ steht, wird beim Rundenstart gezogen.
          </p>
          <BoardPlanner gameId={state.id} rounds={ROUND_MULTIPLIER.map((_, i) => i + 1)} />
        </section>
      )}
    </div>
  );
}
