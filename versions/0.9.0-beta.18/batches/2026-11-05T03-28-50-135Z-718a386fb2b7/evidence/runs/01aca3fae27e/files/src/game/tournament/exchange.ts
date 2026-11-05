import { unknownTournamentField } from './unknown-field.ts';
import { isWon } from '../game.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { hasExactKeys, isJsonObject } from '../saved-format.ts';
import { isTournament } from './validation.ts';
import type { Tournament } from './model.ts';
export function exportTournament(t: Tournament | null, snapshot: string | null = null): string {
  const sort = (_key: string, value: unknown): unknown =>
    isJsonObject(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value;
  return JSON.stringify(
    {
      format: 'neon-pairs/tournament',
      snapshot: snapshot ? JSON.parse(snapshot) : null,
      tournament: t,
      version: 1,
    },
    sort,
    2,
  );
}
export function importTournament(text: string): {
  tournament: Tournament | null;
  snapshot: string | null;
  error: string;
} {
  try {
    if (new TextEncoder().encode(text).length > 65536) throw 0;
    const value: unknown = JSON.parse(text);
    if (!isJsonObject(value)) throw 0;
    const field = unknownTournamentField(value);
    if (field) return { tournament: null, snapshot: null, error: `Unknown field: ${field}.` };
    if (
      !hasExactKeys(value, ['format', 'snapshot', 'tournament', 'version']) ||
      value.format !== 'neon-pairs/tournament' ||
      value.version !== 1 ||
      (value.tournament !== null && !isTournament(value.tournament))
    )
      throw 0;
    const snapshot = value.snapshot === null ? null : JSON.stringify(value.snapshot);
    if (snapshot) {
      const game = decodeSnapshot(snapshot);
      const t = value.tournament;
      if (
        !game ||
        isWon(game) ||
        !t ||
        t.matches[t.index]!.winner !== null ||
        game.boardCode !== t.matches[t.index]!.boardCode
      )
        throw 0;
    }
    return { tournament: value.tournament, snapshot, error: '' };
  } catch {
    return { tournament: null, snapshot: null, error: 'Invalid tournament.' };
  }
}
