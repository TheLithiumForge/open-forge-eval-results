import { isWon } from './game.ts';
import { isJsonObject } from './saved-format.ts';
import { decodeSnapshot } from './snapshot.ts';
import { validateTournament } from './tournament.ts';
import type { TournamentState } from './tournament.ts';

const KEY = 'np3:tournaments';
export function saveHistory(items: TournamentState[], item: TournamentState) {
  const serialized = JSON.stringify(item);
  const updated = [item, ...items.filter((entry) => JSON.stringify(entry) !== serialized)].slice(
    0,
    10,
  );
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 3, items: updated }));
    return { items: updated, unavailable: false };
  } catch {
    return { items: updated, unavailable: true };
  }
}
export function readHistory(): { items: TournamentState[]; unavailable: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { items: [], unavailable: false };
    const value: unknown = JSON.parse(raw);
    if (
      !isJsonObject(value) ||
      Object.keys(value).length !== 2 ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > 10
    )
      return { items: [], unavailable: false };
    const items = value.items.map(validateTournament);
    if (items.some((item) => item.phase !== 'complete')) return { items: [], unavailable: false };
    return { items, unavailable: false };
  } catch (error) {
    return {
      items: [],
      unavailable:
        !(error instanceof SyntaxError) &&
        !(
          error instanceof Error &&
          (error.message === 'Invalid tournament.' || error.message.startsWith('Unknown field:'))
        ),
    };
  }
}
export function encode(tournament: TournamentState | null, snapshot: string | null): string {
  // Object keys are alphabetical at every level, including nested snapshots.
  const sort = (_key: string, value: unknown): unknown =>
    isJsonObject(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value;
  return JSON.stringify(
    { format: 'neon-pairs/tournament', snapshot, tournament, version: 1 },
    sort,
    2,
  );
}
export function decode(text: string): {
  tournament: TournamentState | null;
  snapshot: string | null;
} {
  if (new TextEncoder().encode(text).length > 65536) throw new Error('Invalid tournament.');
  const value: unknown = JSON.parse(text);
  if (!isJsonObject(value)) throw new Error('Invalid tournament.');
  const extra = Object.keys(value).find(
    (key) => !['format', 'snapshot', 'tournament', 'version'].includes(key),
  );
  if (extra) throw new Error(`Unknown field: ${extra}.`);
  if (
    Object.keys(value).length !== 4 ||
    value.format !== 'neon-pairs/tournament' ||
    value.version !== 1
  )
    throw new Error('Invalid tournament.');
  const tournament = value.tournament === null ? null : validateTournament(value.tournament);
  if (value.snapshot !== null && typeof value.snapshot !== 'string')
    throw new Error('Invalid tournament.');
  if ((tournament?.phase === 'playing') !== (typeof value.snapshot === 'string'))
    throw new Error('Invalid tournament.');
  if (typeof value.snapshot === 'string') {
    const game = decodeSnapshot(value.snapshot);
    if (!game || isWon(game) || game.boardCode !== tournament?.matches.at(-1)?.boardCode)
      throw new Error('Invalid tournament.');
  }
  return { tournament, snapshot: value.snapshot };
}
