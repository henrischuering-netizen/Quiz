import { BASE_POINTS } from "@/lib/game";
import type { GameState } from "@/lib/api";

type Props = {
  categories: GameState["categories"];
  cells: GameState["cells"];
  /** Nur der Host bekommt onOpen; für Spieler ist das Board nur zum Ansehen. */
  onOpen?: (cellId: string) => void;
};

export default function Board({ categories, cells, onOpen }: Props) {
  return (
    <div
      className="grid h-full w-full gap-2 sm:gap-3"
      style={{
        gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))`,
        gridTemplateRows: `auto repeat(${BASE_POINTS.length}, minmax(3rem, 1fr))`,
      }}
    >
      {categories.map((c) => (
        <div
          key={c.col}
          className="flex min-h-20 items-center justify-center rounded-lg bg-panel p-2 text-center text-sm font-extrabold uppercase tracking-wide sm:text-lg"
        >
          {c.name}
        </div>
      ))}
      {BASE_POINTS.map((_, row) =>
        categories.map((c) => {
          const cell = cells.find((x) => x.col === c.col && x.difficulty === row + 1);
          if (!cell) return <div key={`${c.col}-${row}`} />;
          return (
            <button
              key={cell.id}
              type="button"
              disabled={cell.used || !onOpen}
              onClick={() => onOpen?.(cell.id)}
              className={`flex items-center justify-center rounded-lg text-2xl font-extrabold shadow-lg transition sm:text-4xl ${
                cell.used
                  ? "bg-panel/40 text-transparent shadow-none"
                  : `bg-tile text-gold ${onOpen ? "hover:bg-tile-hover" : "cursor-default"}`
              }`}
            >
              {cell.points}
            </button>
          );
        }),
      )}
    </div>
  );
}
