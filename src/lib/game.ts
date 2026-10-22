// Spielregeln, wie sie die Datenbank-Funktion _build_round umsetzt
// (supabase/migrations/003_online.sql). Bei Änderungen beides anpassen.

/** Punkte pro Schwierigkeit 1–4 in Runde 1. */
export const BASE_POINTS = [100, 200, 300, 500];
export const CATEGORIES_PER_ROUND = 5;
/** Punkte-Multiplikator je Runde; die Länge ist die Anzahl der Runden. */
export const ROUND_MULTIPLIER = [1, 2];
export const TOTAL_ROUNDS = ROUND_MULTIPLIER.length;
