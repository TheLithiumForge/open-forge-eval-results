import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS } from '../game.ts';
import { MOVES_MAX } from '../game.ts';
import { isJsonObject } from '../saved-format.ts';

export interface Result {
  moves: number;
  elapsedMs: number;
}
interface Match {
  players: [number | null, number | null];
  results: [Result | null, Result | null];
  code: string;
  winner: number | null;
}
export interface Tournament {
  names: string[];
  matches: Match[][];
  currentRound: number;
  currentMatch: number;
  turn: number;
  phase: 'ready' | 'playing' | 'turnEnd' | 'matchEnd' | 'complete';
  snapshot: string | null;
}

export function normalizeNames(drafts: string[]): string[] | string {
  const names = drafts.map((name) => name.trim().replace(/\s+/gu, ' ').normalize('NFC'));
  if (names.some((name) => Array.from(name).length < 2 || Array.from(name).length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return names;
}

export function roundName(count: number): string {
  return count === 4 ? 'Quarterfinal' : count === 2 ? 'Semifinal' : 'Final';
}
export function roundSize(count: number): number {
  return count === 4 ? 4 : count === 2 ? 6 : 8;
}

export function createTournament(names: string[], codes: string[][]): Tournament {
  const order = names.length === 4 ? [1, 4, 2, 3] : [1, 8, 4, 5, 3, 6, 2, 7];
  const matches = codes.map((round, r) =>
    round.map((code, i): Match => ({
      players: r === 0 ? [order[i * 2]!, order[i * 2 + 1]!] : [null, null],
      results: [null, null],
      code,
      winner: null,
    })),
  );
  return {
    names,
    matches,
    currentRound: 0,
    currentMatch: 0,
    turn: 0,
    phase: 'ready',
    snapshot: null,
  };
}

export function recordResult(t: Tournament, result: Result): Tournament {
  const matches = t.matches.map((round) =>
    round.map((match) => ({
      ...match,
      players: [match.players[0], match.players[1]] satisfies Match['players'],
      results: [match.results[0], match.results[1]] satisfies Match['results'],
    })),
  );
  const match = matches[t.currentRound]![t.currentMatch]!;
  match.results[t.turn] = result;
  if (t.turn === 0) return { ...t, matches, phase: 'turnEnd', snapshot: null };
  const a = match.results[0]!;
  const b = match.results[1]!;
  const winnerIndex =
    a.moves !== b.moves
      ? a.moves < b.moves
        ? 0
        : 1
      : a.elapsedMs !== b.elapsedMs
        ? a.elapsedMs < b.elapsedMs
          ? 0
          : 1
        : match.players[0]! < match.players[1]!
          ? 0
          : 1;
  match.winner = match.players[winnerIndex];
  if (matches[t.currentRound + 1])
    matches[t.currentRound + 1]![Math.floor(t.currentMatch / 2)]!.players[t.currentMatch % 2] =
      match.winner;
  return {
    ...t,
    matches,
    phase: t.currentRound === matches.length - 1 ? 'complete' : 'matchEnd',
    snapshot: null,
  };
}

export function nextTurn(t: Tournament): Tournament {
  return { ...t, turn: 1, phase: 'ready' };
}
export function nextMatch(t: Tournament): Tournament {
  const last = t.currentMatch + 1 === t.matches[t.currentRound]!.length;
  return {
    ...t,
    currentRound: t.currentRound + (last ? 1 : 0),
    currentMatch: last ? 0 : t.currentMatch + 1,
    turn: 0,
    phase: 'ready',
  };
}

export function isTournamentResult(value: unknown, size: number): value is Result {
  if (!isJsonObject(value)) return false;
  const r = value;
  return (
    typeof r.moves === 'number' &&
    typeof r.elapsedMs === 'number' &&
    Number.isInteger(r.moves) &&
    r.moves >= (size * size) / 2 &&
    r.moves <= MOVES_MAX &&
    Number.isFinite(r.elapsedMs) &&
    r.elapsedMs >= 0 &&
    r.elapsedMs <= ELAPSED_MAX_MS
  );
}
export function isTournamentCode(code: unknown, size: number): code is string {
  return typeof code === 'string' && parseBoardCode(code)?.size === size;
}
