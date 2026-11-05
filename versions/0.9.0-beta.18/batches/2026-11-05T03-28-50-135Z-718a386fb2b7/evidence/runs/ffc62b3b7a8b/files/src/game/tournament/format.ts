import { decodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import { isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import {
  nameError,
  normalizeName,
  playersFor,
  roundSize,
  isValidCode,
  isValidResult,
} from './tournament.ts';
import type { Match, Result, TournamentState } from './tournament.ts';

interface Exported {
  tournament: TournamentState | null;
  snapshot: string | null;
}
const phases: readonly string[] = ['ready', 'playing', 'turnComplete', 'matchComplete', 'champion'];
function keys(value: Record<string, unknown>, expected: string[]): string | null {
  const extra = Object.keys(value).find((key) => !expected.includes(key));
  if (extra !== undefined) return `Unknown field: ${extra}.`;
  return expected.every((key) => Object.hasOwn(value, key)) ? null : 'Invalid tournament.';
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
export function encodeTournament(data: Exported): string {
  return JSON.stringify(sorted({ format: 'neon-pairs/tournament', version: 1, ...data }), null, 2);
}
export function decodeTournament(text: string): { data?: Exported; error?: string } {
  if (!isWithinBytes(text, 262144)) return { error: 'Invalid tournament.' };
  const root = parseJson(text);
  if (!isJsonObject(root)) return { error: 'Invalid tournament.' };
  const rootError = keys(root, ['format', 'version', 'tournament', 'snapshot']);
  if (rootError) return { error: rootError };
  if (root.format !== 'neon-pairs/tournament' || root.version !== 1)
    return { error: 'Invalid tournament.' };
  if (root.tournament === null && root.snapshot === null)
    return { data: { tournament: null, snapshot: null } };
  if (!isJsonObject(root.tournament)) return { error: 'Invalid tournament.' };
  const value = root.tournament;
  const error = keys(value, ['names', 'matches', 'phase']);
  if (error) return { error };
  if (
    !Array.isArray(value.names) ||
    ![4, 8].includes(value.names.length) ||
    !value.names.every(
      (name: unknown) => typeof name === 'string' && name === normalizeName(name),
    ) ||
    nameError(value.names)
  )
    return { error: 'Invalid tournament.' };
  if (
    !Array.isArray(value.matches) ||
    value.matches.length < 1 ||
    value.matches.length >= value.names.length ||
    typeof value.phase !== 'string' ||
    !phases.includes(value.phase)
  )
    return { error: 'Invalid tournament.' };
  const matches: Match[] = [];
  for (const [index, item] of value.matches.entries()) {
    if (!isJsonObject(item)) return { error: 'Invalid tournament.' };
    const matchError = keys(item, ['boardCode', 'players', 'results']);
    if (matchError) return { error: matchError };
    if (
      typeof item.boardCode !== 'string' ||
      !isValidCode(item.boardCode, roundSize(value.names.length, index)) ||
      matches.some((match) => match.boardCode === item.boardCode) ||
      !Array.isArray(item.players) ||
      item.players.length !== 2 ||
      !Array.isArray(item.results) ||
      item.results.length > 2
    )
      return { error: 'Invalid tournament.' };
    let expected: [number, number];
    try {
      expected = playersFor(value.names.length, matches, index);
    } catch {
      return { error: 'Invalid tournament.' };
    }
    if (
      item.players[0] !== expected[0] ||
      item.players[1] !== expected[1] ||
      (index < value.matches.length - 1 && item.results.length !== 2)
    )
      return { error: 'Invalid tournament.' };
    const results: Result[] = [];
    for (const result of item.results) {
      if (!isJsonObject(result)) return { error: 'Invalid tournament.' };
      const resultError = keys(result, ['moves', 'elapsedMs']);
      if (resultError) return { error: resultError };
      if (
        typeof result.moves !== 'number' ||
        typeof result.elapsedMs !== 'number' ||
        !isValidResult(
          { moves: result.moves, elapsedMs: result.elapsedMs },
          roundSize(value.names.length, index),
        )
      )
        return { error: 'Invalid tournament.' };
      results.push({ moves: result.moves, elapsedMs: result.elapsedMs });
    }
    matches.push({ boardCode: item.boardCode, players: expected, results });
  }
  const last = matches[matches.length - 1]!;
  const phase = value.phase;
  if (
    phase !== 'ready' &&
    phase !== 'playing' &&
    phase !== 'turnComplete' &&
    phase !== 'matchComplete' &&
    phase !== 'champion'
  )
    return { error: 'Invalid tournament.' };
  const expectedCount =
    phase === 'ready' || phase === 'playing'
      ? last.results.length <= 1
      : phase === 'turnComplete'
        ? last.results.length === 1
        : last.results.length === 2;
  if (
    !expectedCount ||
    (phase === 'champion' &&
      (last.results.length !== 2 || matches.length !== value.names.length - 1))
  )
    return { error: 'Invalid tournament.' };
  if (phase === 'playing') {
    if (typeof root.snapshot !== 'string') return { error: 'Invalid tournament.' };
    const game = decodeSnapshot(root.snapshot);
    if (!game || isWon(game) || game.boardCode !== last.boardCode)
      return { error: 'Invalid tournament.' };
  } else if (root.snapshot !== null) return { error: 'Invalid tournament.' };
  return {
    data: {
      tournament: { names: value.names, matches, phase },
      snapshot: typeof root.snapshot === 'string' ? root.snapshot : null,
    },
  };
}
