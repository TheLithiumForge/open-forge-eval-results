import { exportTournament, importTournament } from './tournament-format.ts';
import type { Tournament } from './tournament.ts';

const HISTORY_KEY = 'neon-pairs.tournaments.v1';
export function readHistory(): Tournament[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.flatMap((item: unknown) => {
      const decoded = importTournament(JSON.stringify(item));
      return decoded.tournament?.phase === 'champion' ? [decoded.tournament] : [];
    });
  } catch {
    return [];
  }
}
export function saveHistory(history: Tournament[]): void {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.map((t) => JSON.parse(exportTournament(t)))),
    );
  } catch {
    /* Storage is optional. */
  }
}
