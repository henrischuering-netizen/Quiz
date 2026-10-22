import { keyLabel, type Player } from "@/lib/game";

type Props = {
  players: Player[];
  buzzedPlayerId?: string | null;
  lockedOut?: string[];
  /** Wenn gesetzt, buzzert ein Klick auf das Spielerfeld. */
  onBuzz?: (playerId: string) => void;
  onAdjust?: (playerId: string, delta: number) => void;
};

export default function Scoreboard({ players, buzzedPlayerId, lockedOut = [], onBuzz, onAdjust }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {players.map((p) => {
        const buzzed = p.id === buzzedPlayerId;
        const locked = lockedOut.includes(p.id);
        return (
          <div
            key={p.id}
            className={`group relative min-w-36 rounded-xl border-2 px-5 py-3 text-center transition ${
              buzzed
                ? "buzz-pulse border-gold bg-gold/20"
                : locked
                  ? "border-red-500/40 bg-red-950/40 opacity-60"
                  : "border-white/10 bg-panel"
            }`}
          >
            <button
              type="button"
              disabled={!onBuzz}
              onClick={() => onBuzz?.(p.id)}
              className="block w-full disabled:cursor-default"
              title={onBuzz ? "Klicken zum Buzzern" : undefined}
            >
              <div className="text-sm font-semibold text-white/70">
                {p.name}{" "}
                <kbd className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">{keyLabel(p.key)}</kbd>
              </div>
              <div className={`text-3xl font-extrabold ${p.score < 0 ? "text-red-400" : "text-gold"}`}>
                {p.score}
              </div>
            </button>
            {onAdjust && (
              <div className="absolute -top-3 right-1 hidden gap-1 group-hover:flex">
                <button
                  type="button"
                  onClick={() => onAdjust(p.id, -100)}
                  className="rounded bg-white/15 px-1.5 text-xs hover:bg-white/30"
                  title="100 Punkte abziehen"
                >
                  −100
                </button>
                <button
                  type="button"
                  onClick={() => onAdjust(p.id, 100)}
                  className="rounded bg-white/15 px-1.5 text-xs hover:bg-white/30"
                  title="100 Punkte hinzufügen"
                >
                  +100
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
