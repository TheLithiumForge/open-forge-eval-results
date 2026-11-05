import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { isJsonObject } from '../saved-format.ts';

export interface Result {
  moves: number;
  elapsedMs: number;
}
interface Match {
  players: [number | null, number | null];
  code: string;
  results: [Result | null, Result | null];
  winner: number | null;
}
export type Phase = 'ready' | 'playing' | 'turn-ended' | 'match-ended' | 'champion';
export interface TournamentData {
  names: string[];
  matches: Match[];
  current: number;
  phase: Phase;
  snapshot: string | null;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}
export function nameError(names: string[]): string {
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return '';
}
export function roundName(count: number, index: number): string {
  if (count === 8 && index < 4) return 'Quarterfinal';
  if (index < count - 2) return 'Semifinal';
  return 'Final';
}
export function roundSize(count: number, index: number): number {
  return { Quarterfinal: 4, Semifinal: 6, Final: 8 }[roundName(count, index)]!;
}
export function newTournament(names: string[], codes: string[]): TournamentData {
  const pairs =
    names.length === 4
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
  const matches: Match[] = codes.map((code, index) => ({
    code,
    players: (pairs[index] ?? [null, null]) as [number | null, number | null],
    results: [null, null],
    winner: null,
  }));
  return { names, matches, current: 0, phase: 'ready', snapshot: null };
}
export function winnerOf(match: Match): number {
  const [a, b] = match.results;
  const [first, second] = match.players;
  if (!a || !b || first === null || second === null) throw new Error('Incomplete match.');
  return a.moves !== b.moves
    ? a.moves < b.moves
      ? first
      : second
    : a.elapsedMs !== b.elapsedMs
      ? a.elapsedMs < b.elapsedMs
        ? first
        : second
      : Math.min(first, second);
}
export function finishTurn(tournament: TournamentData, result: Result): TournamentData {
  const matches: Match[] = tournament.matches.map((match) => ({
    ...match,
    players: [match.players[0], match.players[1]],
    results: [match.results[0], match.results[1]],
  }));
  const match = matches[tournament.current]!;
  if (!match.results[0]) {
    match.results[0] = result;
    return { ...tournament, matches, phase: 'turn-ended', snapshot: null };
  }
  match.results[1] = result;
  match.winner = winnerOf(match);
  if (tournament.current < matches.length - 1) {
    const roundStart =
      tournament.current < tournament.names.length / 2 ? 0 : tournament.names.length / 2;
    const nextStart = roundStart === 0 ? tournament.names.length / 2 : matches.length - 1;
    const offset = tournament.current - roundStart;
    matches[nextStart + Math.floor(offset / 2)]!.players[offset % 2] = match.winner;
  }
  return { ...tournament, matches, phase: 'match-ended', snapshot: null };
}
export function isValidResult(value: unknown, size: number): value is Result {
  if (!isJsonObject(value)) return false;
  const v = value;
  return (
    Object.keys(v).sort().join(',') === 'elapsedMs,moves' &&
    typeof v.moves === 'number' &&
    Number.isSafeInteger(v.moves) &&
    v.moves >= (size * size) / 2 &&
    v.moves <= MOVES_MAX &&
    typeof v.elapsedMs === 'number' &&
    Number.isFinite(v.elapsedMs) &&
    v.elapsedMs >= 0 &&
    v.elapsedMs <= ELAPSED_MAX_MS
  );
}
export function isValidCode(code: unknown, size: number): code is string {
  return typeof code === 'string' && parseBoardCode(code)?.size === size;
}
