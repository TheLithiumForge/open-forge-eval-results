import { decodeTournament, encodeTournament } from './tournament-format.ts';
import type { TournamentState } from './tournament.ts';
import type { PreferenceStore } from '../session/storage.ts';

export const TOURNAMENTS_KEY = 'neon-pairs.tournaments.v1';

export function readTournaments(store: PreferenceStore | null): readonly TournamentState[] {
  try {
    return decodeTournament(store?.getItem(TOURNAMENTS_KEY) ?? '')?.pastTournaments ?? [];
  } catch {
    return [];
  }
}

export function writeTournaments(
  store: PreferenceStore | null,
  pastTournaments: readonly TournamentState[],
): string {
  try {
    if (!store) return 'Tournament history could not be saved. Export it to keep a copy.';
    store.setItem(
      TOURNAMENTS_KEY,
      encodeTournament({ version: 1, tournament: null, pastTournaments }),
    );
    return '';
  } catch {
    return 'Tournament history could not be saved. Export it to keep a copy.';
  }
}
