import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { isJsonObject } from '../saved-format.ts';

export interface Result {
  moves: number;
  elapsedMs: number;
}
interface Match {
  players: [number, number];
  code: string;
  results: Result[];
}
export interface TournamentState {
  names: string[];
  matches: Match[];
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}
export function namesError(names: string[]): string {
  if (names.some((name) => Array.from(name).length < 2 || Array.from(name).length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return '';
}
export function roundSize(count: number, index: number): number {
  return count === 8 && index < 4 ? 4 : index < count - 2 ? 6 : 8;
}
export function roundName(count: number, index: number): string {
  return roundSize(count, index) === 4
    ? 'Quarterfinal'
    : roundSize(count, index) === 6
      ? 'Semifinal'
      : 'Final';
}
export function winner(match: Match): number | null {
  const [a, b] = match.results;
  if (!a || !b) return null;
  const [first, second] = match.players;
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
export function nextPlayers(t: TournamentState): [number, number] | null {
  const n = t.names.length,
    i = t.matches.length;
  const opening: [number, number][] =
    n === 4
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
  if (i < opening.length) return opening[i] ?? null;
  if (i >= n - 1) return null;
  const first = n === 8 && i < 6 ? (i - 4) * 2 : n === 8 ? 4 : 0;
  const a = t.matches[first],
    b = t.matches[first + 1];
  if (!a || !b) return null;
  const wa = winner(a),
    wb = winner(b);
  return wa === null || wb === null ? null : [wa, wb];
}
export function isValidResult(value: unknown, size: number): value is Result {
  if (!isJsonObject(value)) return false;
  const r = value;
  return (
    Object.keys(r).sort().join(',') === 'elapsedMs,moves' &&
    typeof r.moves === 'number' &&
    Number.isInteger(r.moves) &&
    r.moves >= (size * size) / 2 &&
    r.moves <= MOVES_MAX &&
    typeof r.elapsedMs === 'number' &&
    Number.isFinite(r.elapsedMs) &&
    r.elapsedMs >= 0 &&
    r.elapsedMs <= ELAPSED_MAX_MS
  );
}
