import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';

export interface Result {
  moves: number;
  elapsedMs: number;
}
export interface Match {
  boardCode: string;
  players: [number, number];
  results: Result[];
}
type Phase = 'ready' | 'playing' | 'turnComplete' | 'matchComplete' | 'champion';
export interface TournamentState {
  names: string[];
  matches: Match[];
  phase: Phase;
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
export function winner(match: Match): number {
  const [a, b] = match.results;
  const [first, second] = match.players;
  if (!a || !b) throw new Error('Match is incomplete');
  if (a.moves !== b.moves) return a.moves < b.moves ? first : second;
  if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs < b.elapsedMs ? first : second;
  return Math.min(first, second);
}
export function roundSize(count: number, index: number): number {
  return index < count / 2 ? (count === 8 ? 4 : 6) : index < count - 2 ? 6 : 8;
}
export function roundName(size: number): string {
  return size === 4 ? 'Quarterfinal' : size === 6 ? 'Semifinal' : 'Final';
}
export function playersFor(count: number, matches: Match[], index: number): [number, number] {
  const seeds =
    count === 4
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
  if (index < count / 2) {
    const pair = seeds[index];
    if (!pair) throw new Error('Invalid match');
    return [pair[0]!, pair[1]!];
  }
  const start =
    index < count - 2 ? (index - count / 2) * 2 : count - 2 === count / 2 ? 0 : count / 2;
  const a = matches[start];
  const b = matches[start + 1];
  if (!a || !b) throw new Error('Missing previous matches');
  return [winner(a), winner(b)];
}
export function nextMatch(tournament: TournamentState, boardCode: string): TournamentState {
  const index = tournament.matches.length;
  return {
    ...tournament,
    phase: 'ready',
    matches: [
      ...tournament.matches,
      {
        boardCode,
        players: playersFor(tournament.names.length, tournament.matches, index),
        results: [],
      },
    ],
  };
}
export function recordResult(tournament: TournamentState, result: Result): TournamentState {
  const matches = tournament.matches.slice();
  const match = matches[matches.length - 1];
  if (!match) throw new Error('Missing match');
  const results = [...match.results, result];
  matches[matches.length - 1] = { ...match, results };
  return { ...tournament, matches, phase: results.length === 1 ? 'turnComplete' : 'matchComplete' };
}
export function isValidResult(result: Result, size: number): boolean {
  return (
    Number.isSafeInteger(result.moves) &&
    result.moves >= (size * size) / 2 &&
    result.moves <= MOVES_MAX &&
    Number.isFinite(result.elapsedMs) &&
    result.elapsedMs >= 0 &&
    result.elapsedMs <= ELAPSED_MAX_MS
  );
}
export function isValidCode(code: string, size: number): boolean {
  return parseBoardCode(code)?.size === size;
}
