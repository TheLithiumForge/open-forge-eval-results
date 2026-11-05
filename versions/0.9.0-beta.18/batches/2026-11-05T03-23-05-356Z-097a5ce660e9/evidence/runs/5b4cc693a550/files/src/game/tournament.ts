import { parseBoardCode } from './deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from './game.ts';
import { isJsonObject } from './saved-format.ts';

interface Result {
  moves: number;
  elapsedMs: number;
}
export interface Match {
  boardCode: string;
  players: [number, number];
  results: [Result | null, Result | null];
  winner: number | null;
}
export interface TournamentState {
  names: string[];
  matches: Match[];
  phase: 'ready' | 'playing' | 'turnEnd' | 'matchEnd' | 'complete';
}
export const normalizeName = (name: string) => name.trim().replace(/\s+/gu, ' ').normalize('NFC');
export function nameError(names: string[]): string {
  if (names.some((name) => Array.from(name).length < 2 || Array.from(name).length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return '';
}
export function opening(count: number): [number, number][] {
  return count === 4
    ? [
        [0, 3],
        [1, 2],
      ]
    : [
        [0, 7],
        [3, 4],
        [2, 5],
        [1, 6],
      ];
}
export function roundFor(count: number, index: number): { name: string; size: number } {
  const remaining = count === 8 && index < 4 ? 8 : index < count - 2 ? 4 : 2;
  return remaining === 8
    ? { name: 'Quarterfinal', size: 4 }
    : remaining === 4
      ? { name: 'Semifinal', size: 6 }
      : { name: 'Final', size: 8 };
}
export function playersFor(t: TournamentState, index: number): [number, number] | null {
  const first = opening(t.names.length);
  if (index < first.length) return first[index] ?? null;
  const offset = index - first.length;
  const source = offset < first.length / 2 ? offset * 2 : first.length;
  const a = t.matches[source]?.winner;
  const b = t.matches[source + 1]?.winner;
  return a == null || b == null ? null : [a, b];
}
export function winnerOf(match: Match): number {
  const [a, b] = match.results;
  if (!a || !b) throw new Error('Match is incomplete.');
  return a.moves !== b.moves
    ? a.moves < b.moves
      ? match.players[0]
      : match.players[1]
    : a.elapsedMs !== b.elapsedMs
      ? a.elapsedMs < b.elapsedMs
        ? match.players[0]
        : match.players[1]
      : Math.min(...match.players);
}
export function nextMatch(t: TournamentState, code: string): TournamentState {
  const players = playersFor(t, t.matches.length);
  if (!players) throw new Error('Players are not ready.');
  return {
    ...t,
    phase: 'ready',
    matches: [...t.matches, { boardCode: code, players, results: [null, null], winner: null }],
  };
}
export function recordResult(t: TournamentState, result: Result): TournamentState {
  const matches = t.matches.slice();
  const current = matches[matches.length - 1];
  if (!current) throw new Error('No match.');
  const results: Match['results'] = current.results[0]
    ? [current.results[0], result]
    : [result, null];
  const match = { ...current, results };
  if (results[1]) match.winner = winnerOf(match);
  matches[matches.length - 1] = match;
  return {
    ...t,
    matches,
    phase: results[1]
      ? matches.length === t.names.length - 1
        ? 'complete'
        : 'matchEnd'
      : 'turnEnd',
  };
}

// Reject unknown fields before interpreting imported data.
function keys(value: Record<string, unknown>, allowed: string[]): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra) throw new Error(`Unknown field: ${extra}.`);
  if (allowed.some((key) => !Object.hasOwn(value, key))) throw new Error('Invalid tournament.');
}
export function validateTournament(value: unknown): TournamentState {
  if (!isJsonObject(value)) throw new Error('Invalid tournament.');
  keys(value, ['names', 'matches', 'phase']);
  const { names, matches, phase } = value;
  if (
    !Array.isArray(names) ||
    ![4, 8].includes(names.length) ||
    !names.every((n) => typeof n === 'string' && normalizeName(n) === n) ||
    nameError(names)
  )
    throw new Error('Invalid tournament.');
  if (
    !Array.isArray(matches) ||
    matches.length < 1 ||
    matches.length >= names.length ||
    (phase !== 'ready' &&
      phase !== 'playing' &&
      phase !== 'turnEnd' &&
      phase !== 'matchEnd' &&
      phase !== 'complete')
  )
    throw new Error('Invalid tournament.');
  const t: TournamentState = { names, matches: [], phase };
  const codes = new Set<string>();
  matches.forEach((raw, index) => {
    if (!isJsonObject(raw)) throw new Error('Invalid tournament.');
    keys(raw, ['boardCode', 'players', 'results', 'winner']);
    const expected = playersFor(t, index);
    if (typeof raw.boardCode !== 'string') throw new Error('Invalid tournament.');
    const code = raw.boardCode;
    const parsed = parseBoardCode(code);
    if (
      !expected ||
      !parsed ||
      parsed.size !== roundFor(names.length, index).size ||
      codes.has(code) ||
      !Array.isArray(raw.players) ||
      raw.players.length !== 2 ||
      raw.players[0] !== expected[0] ||
      raw.players[1] !== expected[1] ||
      !Array.isArray(raw.results) ||
      raw.results.length !== 2
    )
      throw new Error('Invalid tournament.');
    const minimumMoves = parsed.size ** 2 / 2;
    codes.add(code);
    function readResult(result: unknown): Result | null {
      if (result === null) return null;
      if (!isJsonObject(result)) throw new Error('Invalid tournament.');
      keys(result, ['elapsedMs', 'moves']);
      if (
        typeof result.moves !== 'number' ||
        !Number.isSafeInteger(result.moves) ||
        result.moves < minimumMoves ||
        result.moves > MOVES_MAX ||
        typeof result.elapsedMs !== 'number' ||
        !Number.isFinite(result.elapsedMs) ||
        result.elapsedMs < 0 ||
        result.elapsedMs > ELAPSED_MAX_MS
      )
        throw new Error('Invalid tournament.');
      return { moves: result.moves, elapsedMs: result.elapsedMs };
    }
    const results: Match['results'] = [readResult(raw.results[0]), readResult(raw.results[1])];
    if ((!results[0] && results[1]) || (index < matches.length - 1 && !results[1]))
      throw new Error('Invalid tournament.');
    const match: Match = {
      boardCode: code,
      players: expected,
      results,
      winner: null,
    };
    if (results[1]) match.winner = winnerOf(match);
    if (raw.winner !== match.winner) throw new Error('Invalid tournament.');
    t.matches.push(match);
  });
  const last = t.matches[t.matches.length - 1]!;
  if (
    (phase === 'ready' && last.results[1]) ||
    (phase === 'playing' && last.results[1]) ||
    (phase === 'turnEnd' && (!last.results[0] || last.results[1])) ||
    (phase === 'matchEnd' && (!last.results[1] || matches.length === names.length - 1)) ||
    (phase === 'complete' && (!last.results[1] || matches.length !== names.length - 1))
  )
    throw new Error('Invalid tournament.');
  return t;
}
