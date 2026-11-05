import { isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { parseBoardCode } from '../deck.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import { snapshotFieldError } from './snapshot-fields.ts';
import {
  createTournament,
  nameError,
  normalizeName,
  recordResult,
  roundSize,
  isValidResult,
} from './rules.ts';
import type { Tournament } from './rules.ts';

interface Document {
  tournament: Tournament | null;
  snapshot: string | null;
}
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (isJsonObject(value))
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sorted(value[key])]),
    );
  return value;
}
export function encodeTournament(document: Document): string {
  return JSON.stringify(
    sorted({ format: 'neon-pairs/tournament', version: 1, ...document }),
    null,
    2,
  );
}
function fields(value: Record<string, unknown>, keys: string[]): string | null {
  const extra = Object.keys(value).find((key) => !keys.includes(key));
  return extra ? `Unknown field: ${extra}.` : null;
}
export function decodeTournament(text: string): { document: Document | null; error: string } {
  const invalid = { document: null, error: 'Invalid tournament.' };
  const root = isWithinBytes(text, 262144) ? parseJson(text) : null;
  if (!isJsonObject(root)) return invalid;
  let error = fields(root, ['format', 'version', 'tournament', 'snapshot']);
  if (error) return { document: null, error };
  const t = root.tournament;
  if (
    root.format === 'neon-pairs/tournament' &&
    root.version === 1 &&
    t === null &&
    root.snapshot === null
  )
    return { document: { tournament: null, snapshot: null }, error: '' };
  if (root.format !== 'neon-pairs/tournament' || root.version !== 1 || !isJsonObject(t))
    return invalid;
  error = fields(t, ['names', 'matches', 'current', 'phase']);
  if (error) return { document: null, error };
  if (
    !Array.isArray(t.names) ||
    ![4, 8].includes(t.names.length) ||
    !t.names.every((n) => typeof n === 'string' && n === normalizeName(n)) ||
    nameError(t.names)
  )
    return invalid;
  if (
    !Array.isArray(t.matches) ||
    t.matches.length !== t.names.length - 1 ||
    !Number.isInteger(t.current) ||
    typeof t.current !== 'number' ||
    t.current < 0 ||
    t.current >= t.matches.length
  )
    return invalid;
  const codes: string[] = [];
  for (const [i, value] of t.matches.entries()) {
    if (!isJsonObject(value)) return invalid;
    error = fields(value, ['code', 'players', 'results', 'winner']);
    if (error) return { document: null, error };
    if (
      typeof value.code !== 'string' ||
      parseBoardCode(value.code)?.size !== roundSize(t.names.length, i) ||
      codes.includes(value.code)
    )
      return invalid;
    codes.push(value.code);
    if (
      !Array.isArray(value.results) ||
      value.results.length !== 2 ||
      !Array.isArray(value.players) ||
      value.players.length !== 2
    )
      return invalid;
    for (const result of value.results) {
      if (result === null) continue;
      if (!isJsonObject(result)) return invalid;
      error = fields(result, ['moves', 'elapsedMs']);
      if (error) return { document: null, error };
      if (
        typeof result.moves !== 'number' ||
        typeof result.elapsedMs !== 'number' ||
        !isValidResult(
          { moves: result.moves, elapsedMs: result.elapsedMs },
          roundSize(t.names.length, i),
        )
      )
        return invalid;
    }
  }
  // Replay accepted results through the bracket rules, then compare every derived field.
  let rebuilt = createTournament(t.names, codes);
  for (let i = 0; i <= t.current; i++) {
    const original = t.matches[i];
    if (!isJsonObject(original) || !Array.isArray(original.results)) return invalid;
    for (const result of original.results) {
      if (result === null) break;
      if (
        !isJsonObject(result) ||
        typeof result.moves !== 'number' ||
        typeof result.elapsedMs !== 'number'
      )
        return invalid;
      rebuilt = recordResult(
        { ...rebuilt, phase: 'playing' },
        { moves: result.moves, elapsedMs: result.elapsedMs },
      );
    }
    if (i < t.current) {
      if (rebuilt.phase !== 'matchDone') return invalid;
      rebuilt = { ...rebuilt, current: i + 1, phase: 'ready' };
    }
  }
  if (
    JSON.stringify(rebuilt.matches) !==
    JSON.stringify(
      t.matches.map((m) => {
        if (!isJsonObject(m)) return null;
        return {
          code: m.code,
          players: m.players,
          results: Array.isArray(m.results)
            ? m.results.map((r) =>
                isJsonObject(r) ? { moves: r.moves, elapsedMs: r.elapsedMs } : r,
              )
            : m.results,
          winner: m.winner,
        };
      }),
    )
  )
    return invalid;
  if (t.phase === 'ready' && rebuilt.phase === 'turnDone') rebuilt = { ...rebuilt, phase: 'ready' };
  if (t.phase === 'playing' && (rebuilt.phase === 'ready' || rebuilt.phase === 'turnDone'))
    rebuilt = { ...rebuilt, phase: 'playing' };
  if (t.phase !== rebuilt.phase) return invalid;
  if (t.phase === 'playing') {
    if (typeof root.snapshot !== 'string') return invalid;
    const snapshotError = snapshotFieldError(root.snapshot);
    if (snapshotError) return { document: null, error: snapshotError };
    const game = decodeSnapshot(root.snapshot);
    if (!game || isWon(game) || game.boardCode !== codes[t.current]) return invalid;
  } else if (root.snapshot !== null) return invalid;
  return {
    document: {
      tournament: rebuilt,
      snapshot: typeof root.snapshot === 'string' ? root.snapshot : null,
    },
    error: '',
  };
}
