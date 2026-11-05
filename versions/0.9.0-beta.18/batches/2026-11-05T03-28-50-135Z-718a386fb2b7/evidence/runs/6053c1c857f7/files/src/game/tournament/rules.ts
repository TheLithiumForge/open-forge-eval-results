import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';

interface Result {
  moves: number;
  elapsedMs: number;
}
interface Match {
  code: string;
  players: [number | null, number | null];
  results: [Result | null, Result | null];
  winner: number | null;
}
type Phase = 'ready' | 'playing' | 'turnDone' | 'matchDone' | 'complete';
export interface Tournament {
  names: string[];
  matches: Match[];
  current: number;
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
export function roundName(count: number, index: number): string {
  const remaining = count - 1 - index;
  return remaining === 1 ? 'Final' : remaining <= 3 ? 'Semifinal' : 'Quarterfinal';
}
export function roundSize(count: number, index: number): number {
  return roundName(count, index) === 'Final' ? 8 : roundName(count, index) === 'Semifinal' ? 6 : 4;
}
export function createTournament(names: string[], codes: string[]): Tournament {
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
    players: [pairs[index]?.[0] ?? null, pairs[index]?.[1] ?? null],
    results: [null, null],
    winner: null,
  }));
  return { names, matches, current: 0, phase: 'ready' };
}
export function playerIndex(match: Match): number {
  return match.results[0] === null ? 0 : 1;
}
export function recordResult(t: Tournament, result: Result): Tournament {
  const matches: Match[] = t.matches.map((match) => ({
    ...match,
    players: [match.players[0], match.players[1]],
    results: [match.results[0], match.results[1]],
  }));
  const match = matches[t.current];
  if (!match || t.phase !== 'playing') return t;
  const player = playerIndex(match);
  match.results[player] = result;
  if (player === 0) return { ...t, matches, phase: 'turnDone' };
  const [a, b] = match.results;
  const [first, second] = match.players;
  if (!a || !b || first === null || second === null) return t;
  match.winner =
    a.moves !== b.moves
      ? a.moves < b.moves
        ? first
        : second
      : a.elapsedMs !== b.elapsedMs
        ? a.elapsedMs < b.elapsedMs
          ? first
          : second
        : Math.min(first, second);
  if (t.current === matches.length - 1) return { ...t, matches, phase: 'complete' };
  const next = Math.floor(t.current / 2) + t.names.length / 2;
  const target = matches[next];
  if (target) target.players[t.current % 2] = match.winner;
  return { ...t, matches, phase: 'matchDone' };
}
export function isValidResult(value: Result, size: number): boolean {
  return (
    Number.isSafeInteger(value.moves) &&
    value.moves >= (size * size) / 2 &&
    value.moves <= MOVES_MAX &&
    Number.isFinite(value.elapsedMs) &&
    value.elapsedMs >= 0 &&
    value.elapsedMs <= ELAPSED_MAX_MS
  );
}
