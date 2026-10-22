import { BASE_POINTS, type Cell } from "@/lib/game";
import type { Category } from "@/lib/questions";

type Props = {
  categories: Category[];
  cells: Cell[];
  onOpen: (cellId: string) => void;
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
          key={c.id}
          className="flex min-h-20 items-center justify-center rounded-lg bg-panel p-2 text-center text-sm font-extrabold uppercase tracking-wide sm:text-lg"
        >
          {c.name}
        </div>
      ))}
      {BASE_POINTS.map((_, row) =>
        categories.map((c) => {
          const cell = cells.find((x) => x.categoryId === c.id && x.difficulty === row + 1);
          if (!cell) return <div key={`${c.id}-${row}`} />;
          return (
            <button
              key={cell.id}
              type="button"
              disabled={cell.used}
              onClick={() => onOpen(cell.id)}
              className="flex items-center justify-center rounded-lg bg-tile text-2xl font-extrabold text-gold shadow-lg transition hover:bg-tile-hover disabled:bg-panel/40 disabled:text-transparent disabled:shadow-none sm:text-4xl"
            >
              {cell.points}
            </button>
          );
        }),
      )}
    </div>
  );
}
