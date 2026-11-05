import { decodePastTournaments, TOURNAMENT_HISTORY_KEY } from './tournament.ts';
import type { TournamentState } from './tournament.ts';

export function readPastTournaments(): TournamentState[] {
  try {
    const text = window.localStorage.getItem(TOURNAMENT_HISTORY_KEY);
    return text ? decodePastTournaments(text) : [];
  } catch {
    return [];
  }
}

export function writePastTournaments(tournaments: readonly TournamentState[]): void {
  try {
    window.localStorage.setItem(TOURNAMENT_HISTORY_KEY, JSON.stringify(tournaments));
  } catch {
    // A blocked or full browser store does not stop the current tournament.
  }
}
