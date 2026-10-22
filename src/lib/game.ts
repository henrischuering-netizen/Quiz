import type { Category, QuestionPool } from "./questions";

/** Punkte pro Schwierigkeit 1–4 in Runde 1. Für eine 400er-Zeile hier ergänzen (und difficulty 1–5 erlauben). */
export const BASE_POINTS = [100, 200, 300, 500];
export const CATEGORIES_PER_ROUND = 5;
export const ROUND_MULTIPLIER = [1, 2];
export const TOTAL_ROUNDS = ROUND_MULTIPLIER.length;
/** Tasten, die der Gamemaster nutzt und die deshalb nicht als Buzzer vergeben werden dürfen. */
export const RESERVED_KEYS = ["r", "f", " ", "escape", "enter"];
export const DEFAULT_KEYS = ["a", "l", "q", "p", "z", "m"];
export const MAX_PLAYERS = DEFAULT_KEYS.length;

export type Player = { id: string; name: string; key: string; score: number };

export type Cell = {
  id: string;
  categoryId: string;
  difficulty: number;
  points: number;
  question: string;
  answer: string;
  used: boolean;
};

export type Round = { categories: Category[]; cells: Cell[] };

export type Phase = "setup" | "board" | "question" | "roundEnd" | "finished";

export type GameState = {
  phase: Phase;
  round: number;
  categories: Category[];
  cells: Cell[];
  players: Player[];
  usedCategoryIds: string[];
  activeCellId: string | null;
  buzzerOpen: boolean;
  buzzedPlayerId: string | null;
  lockedOut: string[];
  answerVisible: boolean;
  /** Frage ist entschieden (richtig beantwortet oder aufgelöst) und wartet auf "Zurück zum Board". */
  resolved: boolean;
};

export type GameAction =
  | { type: "START"; players: Player[]; firstRound: Round }
  | { type: "OPEN_CELL"; cellId: string }
  | { type: "BUZZ"; playerId: string }
  | { type: "JUDGE"; correct: boolean }
  | { type: "REVEAL" }
  | { type: "CLOSE_CELL" }
  | { type: "NEXT_ROUND"; nextRound: Round }
  | { type: "ADJUST_SCORE"; playerId: string; delta: number }
  | { type: "RESET" };

export const initialState: GameState = {
  phase: "setup",
  round: 1,
  categories: [],
  cells: [],
  players: [],
  usedCategoryIds: [],
  activeCellId: null,
  buzzerOpen: false,
  buzzedPlayerId: null,
  lockedOut: [],
  answerVisible: false,
  resolved: false,
};

const questionReset = {
  activeCellId: null,
  buzzerOpen: false,
  buzzedPlayerId: null,
  lockedOut: [],
  answerVisible: false,
  resolved: false,
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Stellt eine Runde zusammen: zufällige Kategorien, die für jede Schwierigkeit
 * mindestens eine Frage haben. Bereits gespielte Kategorien werden nur genutzt,
 * wenn sonst nicht genug übrig sind.
 */
export function buildRound(pool: QuestionPool, round: number, excludeCategoryIds: string[]): Round {
  const multiplier = ROUND_MULTIPLIER[round - 1] ?? 1;
  const complete = pool.categories.filter((c) =>
    BASE_POINTS.every((_, i) =>
      pool.questions.some((q) => q.category_id === c.id && q.difficulty === i + 1),
    ),
  );
  const fresh = shuffle(complete.filter((c) => !excludeCategoryIds.includes(c.id)));
  const reused = shuffle(complete.filter((c) => excludeCategoryIds.includes(c.id)));
  const categories = [...fresh, ...reused].slice(0, CATEGORIES_PER_ROUND);

  const cells: Cell[] = categories.flatMap((c) =>
    BASE_POINTS.map((base, i) => {
      const options = pool.questions.filter(
        (q) => q.category_id === c.id && q.difficulty === i + 1,
      );
      const q = options[Math.floor(Math.random() * options.length)];
      return {
        id: `${round}-${c.id}-${i + 1}`,
        categoryId: c.id,
        difficulty: i + 1,
        points: base * multiplier,
        question: q.question,
        answer: q.answer,
        used: false,
      };
    }),
  );
  return { categories, cells };
}

/** Anzahl der Kategorien, die vollständig genug für ein Grid sind. */
export function playableCategoryCount(pool: QuestionPool): number {
  return pool.categories.filter((c) =>
    BASE_POINTS.every((_, i) =>
      pool.questions.some((q) => q.category_id === c.id && q.difficulty === i + 1),
    ),
  ).length;
}

export function activeCell(state: GameState): Cell | undefined {
  return state.cells.find((c) => c.id === state.activeCellId);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START":
      return {
        ...initialState,
        phase: "board",
        players: action.players,
        categories: action.firstRound.categories,
        cells: action.firstRound.cells,
        usedCategoryIds: action.firstRound.categories.map((c) => c.id),
      };

    case "OPEN_CELL": {
      const cell = state.cells.find((c) => c.id === action.cellId);
      if (state.phase !== "board" || !cell || cell.used) return state;
      return { ...state, ...questionReset, phase: "question", activeCellId: cell.id, buzzerOpen: true };
    }

    case "BUZZ":
      if (
        state.phase !== "question" ||
        !state.buzzerOpen ||
        state.lockedOut.includes(action.playerId) ||
        !state.players.some((p) => p.id === action.playerId)
      ) {
        return state;
      }
      return { ...state, buzzerOpen: false, buzzedPlayerId: action.playerId };

    case "JUDGE": {
      const cell = activeCell(state);
      const playerId = state.buzzedPlayerId;
      if (state.phase !== "question" || !cell || !playerId) return state;
      const delta = action.correct ? cell.points : -Math.round(cell.points / 2);
      const players = state.players.map((p) =>
        p.id === playerId ? { ...p, score: p.score + delta } : p,
      );
      if (action.correct) {
        return { ...state, players, buzzedPlayerId: null, answerVisible: true, resolved: true };
      }
      const lockedOut = [...state.lockedOut, playerId];
      const anyoneLeft = state.players.some((p) => !lockedOut.includes(p.id));
      return { ...state, players, lockedOut, buzzedPlayerId: null, buzzerOpen: anyoneLeft };
    }

    case "REVEAL":
      if (state.phase !== "question") return state;
      return { ...state, answerVisible: true, resolved: true, buzzerOpen: false, buzzedPlayerId: null };

    case "CLOSE_CELL": {
      if (state.phase !== "question") return state;
      const cells = state.cells.map((c) => (c.id === state.activeCellId ? { ...c, used: true } : c));
      const roundDone = cells.every((c) => c.used);
      const phase: Phase = !roundDone ? "board" : state.round < TOTAL_ROUNDS ? "roundEnd" : "finished";
      return { ...state, ...questionReset, cells, phase };
    }

    case "NEXT_ROUND":
      if (state.phase !== "roundEnd") return state;
      return {
        ...state,
        ...questionReset,
        phase: "board",
        round: state.round + 1,
        categories: action.nextRound.categories,
        cells: action.nextRound.cells,
        usedCategoryIds: [
          ...state.usedCategoryIds,
          ...action.nextRound.categories.map((c) => c.id),
        ],
      };

    case "ADJUST_SCORE":
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId ? { ...p, score: p.score + action.delta } : p,
        ),
      };

    case "RESET":
      return initialState;
  }
}

export function keyLabel(key: string): string {
  return key.length === 1 ? key.toUpperCase() : key;
}
