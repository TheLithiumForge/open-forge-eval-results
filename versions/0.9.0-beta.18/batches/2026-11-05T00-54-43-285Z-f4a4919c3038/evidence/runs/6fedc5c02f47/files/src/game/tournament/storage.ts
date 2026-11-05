import { decodeTournament, encodeTournament } from './tournament-format.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { TournamentRecord } from './tournament.ts';

export const TOURNAMENTS_KEY = 'neon-pairs.tournaments.v1';

export function readPastTournaments(store: PreferenceStore | null): readonly TournamentRecord[] {
  try {
    const text = store?.getItem(TOURNAMENTS_KEY);
    return text ? (decodeTournament(text)?.past ?? []) : [];
  } catch {
    return [];
  }
}

export function writePastTournaments(
  store: PreferenceStore | null,
  past: readonly TournamentRecord[],
): void {
  try {
    store?.setItem(TOURNAMENTS_KEY, encodeTournament({ active: null, past }));
  } catch {
    // Play and JSON export remain available when browser storage is blocked or full.
  }
}
