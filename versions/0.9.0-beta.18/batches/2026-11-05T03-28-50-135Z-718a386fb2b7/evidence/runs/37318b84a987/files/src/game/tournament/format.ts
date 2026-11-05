import { decodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import { createTournament, nextMatch, nextTurn, recordResult } from './rules.ts';
import { isJsonObject } from '../saved-format.ts';
import { isTournament, tournamentFields } from './validate.ts';
import type { Tournament } from './rules.ts';

function object(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid tournament.';
  for (const key of Object.keys(value)) if (!keys.includes(key)) return `Unknown field: ${key}.`;
  return keys.every((key) => Object.hasOwn(value, key)) ? null : 'Invalid tournament.';
}
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sorted(item)]),
    );
  return value;
}
export function exportTournament(tournament: Tournament | null): string {
  return JSON.stringify(
    sorted({ format: 'neon-pairs/tournament', tournament, version: 1 }),
    null,
    2,
  );
}
export function readTournament(text: string): { value?: Tournament | null; error?: string } {
  try {
    if (new TextEncoder().encode(text).length > 65536) return { error: 'Invalid tournament.' };
    const root: unknown = JSON.parse(text);
    let error = object(root, ['format', 'tournament', 'version']);
    if (error) return { error };
    if (!isJsonObject(root)) throw 0;
    const data = root;
    if (data.format !== 'neon-pairs/tournament' || data.version !== 1)
      return { error: 'Invalid tournament.' };
    if (data.tournament === null) return { value: null };
    error = tournamentFields(data.tournament);
    if (error) return { error };
    if (!isTournament(data.tournament)) throw 0;
    const t = data.tournament;
    const lengths = t.matches.map((round) => round.length);
    let expected = createTournament(
      t.names,
      t.matches.map((round) => round.map((m) => m.code)),
    );
    for (let r = 0; r < lengths.length; r++)
      for (let m = 0; m < lengths[r]!; m++) {
        const match = t.matches[r]![m]!;
        for (let turn = 0; turn < 2; turn++) {
          const result = match.results[turn];
          if (result !== null) {
            if (
              expected.currentRound !== r ||
              expected.currentMatch !== m ||
              expected.turn !== turn ||
              expected.phase !== 'ready'
            )
              throw 0;
            expected = recordResult(expected, result!);
            if (
              expected.phase === 'turnEnd' &&
              (r !== t.currentRound || m !== t.currentMatch || t.phase !== 'turnEnd')
            )
              expected = nextTurn(expected);
            if (
              expected.phase === 'matchEnd' &&
              (r !== t.currentRound || m !== t.currentMatch || t.phase !== 'matchEnd')
            )
              expected = nextMatch(expected);
          }
        }
      }
    if (t.phase === 'playing' && expected.phase === 'ready') expected.phase = 'playing';
    if (t.phase === 'playing') {
      if (typeof t.snapshot !== 'string') throw 0;
      const game = decodeSnapshot(t.snapshot);
      if (
        !game ||
        isWon(game) ||
        game.boardCode !== t.matches[t.currentRound]?.[t.currentMatch]?.code
      )
        throw 0;
    } else if (t.snapshot !== null) throw 0;
    expected.snapshot = t.snapshot;
    if (JSON.stringify(sorted(expected)) !== JSON.stringify(sorted(t))) throw 0;
    return { value: t };
  } catch {
    return { error: 'Invalid tournament.' };
  }
}
