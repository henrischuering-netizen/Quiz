import type { GameState, QueueEntry } from "@/lib/api";

type Props = {
  players: GameState["players"];
  me: string;
  queue?: QueueEntry[];
  turnUserId?: string;
};

export default function Scoreboard({ players, me, queue = [], turnUserId }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {players.map((p) => {
        const entry = queue.find((q) => q.user_id === p.user_id);
        const isTurn = p.user_id === turnUserId;
        const wrong = entry?.result === "wrong";
        const waiting = entry && entry.result === null && !isTurn;
        return (
          <div
            key={p.user_id}
            className={`min-w-36 rounded-xl border-2 px-5 py-3 text-center transition ${
              isTurn
                ? "buzz-pulse border-gold bg-gold/20"
                : wrong
                  ? "border-red-500/40 bg-red-950/40 opacity-60"
                  : waiting
                    ? "border-gold/40 bg-panel"
                    : "border-white/10 bg-panel"
            }`}
          >
            <div className="text-sm font-semibold text-white/70">
              {p.username}
              {p.user_id === me && " (du)"}
            </div>
            <div className={`text-3xl font-extrabold ${p.score < 0 ? "text-red-400" : "text-gold"}`}>{p.score}</div>
          </div>
        );
      })}
    </div>
  );
}
