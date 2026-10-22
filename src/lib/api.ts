import { getSupabase } from "./supabase";

export type Mode = "text" | "voice";
export type GameStatus = "lobby" | "board" | "question" | "round_end" | "finished";

export type QueueEntry = {
  user_id: string;
  username: string;
  result: "correct" | "wrong" | null;
  answered: boolean;
  answer_text: string | null;
};

export type GameState = {
  id: string;
  code: string;
  mode: Mode;
  status: GameStatus;
  round: number;
  answer_visible: boolean;
  resolved: boolean;
  is_host: boolean;
  me: string;
  host: { user_id: string; username: string };
  players: { user_id: string; username: string; score: number }[];
  categories: { col: number; name: string }[];
  cells: { id: string; col: number; difficulty: number; points: number; used: boolean }[];
  active: {
    id: string;
    col: number;
    points: number;
    question: string;
    answer: string | null;
    category: string;
    queue: QueueEntry[];
  } | null;
  invites: { user_id: string; username: string; status: "pending" | "accepted" | "declined" }[] | null;
};

export type Friend = {
  friendship_id: string;
  user_id: string;
  username: string;
  status: "friend" | "incoming" | "outgoing";
};

export type MyGame = {
  id: string;
  code: string;
  mode: Mode;
  status: GameStatus;
  host_username: string;
  is_host: boolean;
  created_at: string;
};

export type Invite = { game_id: string; host_username: string; mode: Mode; created_at: string };

/** Ruft eine Postgres-Funktion auf; Fehlermeldungen aus der Datenbank sind schon deutsch. */
export async function rpc<T = void>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Wer gerade antworten darf: der älteste Eintrag der Schlange ohne Bewertung. */
export function currentTurn(state: GameState): QueueEntry | undefined {
  if (!state.active || state.resolved) return undefined;
  return state.active.queue.find((q) => q.result === null);
}

export const api = {
  gameState: (game: string) => rpc<GameState>("get_game_state", { p_game: game }),
  createGame: (mode: Mode) => rpc<string>("create_game", { p_mode: mode }),
  joinByCode: (code: string) => rpc<string>("join_game_by_code", { p_code: code }),
  invite: (game: string, user: string) => rpc("invite_to_game", { p_game: game, p_user: user }),
  respondInvite: (game: string, accept: boolean) => rpc("respond_invite", { p_game: game, p_accept: accept }),
  start: (game: string) => rpc("start_game", { p_game: game }),
  openCell: (game: string, cell: string) => rpc("open_cell", { p_game: game, p_cell: cell }),
  buzz: (game: string) => rpc("buzz", { p_game: game }),
  submitAnswer: (game: string, text: string) => rpc("submit_answer", { p_game: game, p_text: text }),
  judge: (game: string, correct: boolean) => rpc("judge", { p_game: game, p_correct: correct }),
  reveal: (game: string) => rpc("reveal", { p_game: game }),
  closeCell: (game: string) => rpc("close_cell", { p_game: game }),
  nextRound: (game: string) => rpc("next_round", { p_game: game }),
  endGame: (game: string) => rpc("end_game", { p_game: game }),
  myGames: () => rpc<MyGame[]>("list_my_games"),
  myInvites: () => rpc<Invite[]>("list_my_invites"),
  friends: () => rpc<Friend[]>("list_friends"),
  sendFriendRequest: (username: string) => rpc("send_friend_request", { p_username: username }),
  respondFriendRequest: (id: string, accept: boolean) =>
    rpc("respond_friend_request", { p_id: id, p_accept: accept }),
  removeFriend: (user: string) => rpc("remove_friend", { p_user: user }),
  usernameAvailable: (username: string) => rpc<boolean>("username_available", { p_username: username }),
  setUsername: (username: string) => rpc("set_username", { p_username: username }),
};
