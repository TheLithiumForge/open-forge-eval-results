import { decodeTournamentHistory, encodeTournamentHistory, TOURNAMENTS_KEY } from './format.ts';
import type { Tournament } from './rules.ts';

interface TournamentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface TournamentHistoryRead {
  readonly tournaments: readonly Tournament[];
  readonly available: boolean;
}

export function browserTournamentStore(): TournamentStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTournamentHistory(store: TournamentStore | null): TournamentHistoryRead {
  if (!store) return { tournaments: [], available: false };
  try {
    const text = store.getItem(TOURNAMENTS_KEY);
    if (text === null) return { tournaments: [], available: true };
    return { tournaments: decodeTournamentHistory(text) ?? [], available: true };
  } catch {
    return { tournaments: [], available: false };
  }
}

export function writeTournamentHistory(
  store: TournamentStore | null,
  tournaments: readonly Tournament[],
): 'saved' | 'unavailable' {
  if (!store) return 'unavailable';
  try {
    store.setItem(TOURNAMENTS_KEY, encodeTournamentHistory(tournaments));
    return 'saved';
  } catch {
    return 'unavailable';
  }
}
