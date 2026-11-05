import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { nameError, normalizeName } from './model.ts';
import type { Result, Tournament } from './model.ts';
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, expected: string[]): boolean {
  return (
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}
function isResult(value: unknown, size: number): value is Result {
  return (
    object(value) &&
    keys(value, ['moves', 'elapsedMs']) &&
    typeof value.moves === 'number' &&
    Number.isInteger(value.moves) &&
    value.moves >= (size * size) / 2 &&
    value.moves <= MOVES_MAX &&
    typeof value.elapsedMs === 'number' &&
    Number.isFinite(value.elapsedMs) &&
    value.elapsedMs >= 0 &&
    value.elapsedMs <= ELAPSED_MAX_MS
  );
}
export function isTournament(value: unknown): value is Tournament {
  if (
    !object(value) ||
    !keys(value, ['names', 'matches', 'index']) ||
    !Array.isArray(value.names) ||
    ![4, 8].includes(value.names.length) ||
    !value.names.every((n: unknown) => typeof n === 'string' && n === normalizeName(n)) ||
    nameError(value.names)
  )
    return false;
  if (
    !Array.isArray(value.matches) ||
    value.matches.length !== value.names.length - 1 ||
    typeof value.index !== 'number' ||
    !Number.isInteger(value.index) ||
    value.index < 0 ||
    value.index >= value.matches.length
  )
    return false;
  const codes = new Set<string>();
  const pairs =
    value.names.length === 4
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
  const expectedPlayers: [number | null, number | null][] = value.matches.map(
    (_: unknown, i: number) => (pairs[i] ? [pairs[i]![0]!, pairs[i]![1]!] : [null, null]),
  );
  for (let i = 0; i < value.matches.length; i++) {
    const m: unknown = value.matches[i];
    if (
      !object(m) ||
      !keys(m, ['boardCode', 'players', 'results', 'winner']) ||
      typeof m.boardCode !== 'string'
    )
      return false;
    const code = parseBoardCode(m.boardCode),
      size =
        i < value.names.length / 2
          ? value.names.length === 8
            ? 4
            : 6
          : i < value.names.length - 2
            ? 6
            : 8;
    if (!code || code.size !== size || codes.has(m.boardCode)) return false;
    codes.add(m.boardCode);
    if (
      !Array.isArray(m.players) ||
      m.players.length !== 2 ||
      m.players.some((p: unknown, j: number) => p !== expectedPlayers[i]![j]) ||
      !Array.isArray(m.results) ||
      m.results.length !== 2
    )
      return false;
    const [a, b] = m.results;
    if ((a !== null && !isResult(a, size)) || (b !== null && !isResult(b, size))) return false;
    if ((!a && b) || (i > value.index && (a || b)) || (i < value.index && (!a || !b))) return false;
    const winner =
      a && b
        ? a.moves !== b.moves
          ? m.players[a.moves < b.moves ? 0 : 1]
          : a.elapsedMs !== b.elapsedMs
            ? m.players[a.elapsedMs < b.elapsedMs ? 0 : 1]
            : Math.min(m.players[0], m.players[1])
        : null;
    if (winner !== m.winner || ((a || b) && m.players.some((p: unknown) => p === null)))
      return false;
    if (winner !== null && i < value.matches.length - 1)
      expectedPlayers[Math.floor(i / 2) + value.names.length / 2]![i % 2] = winner;
  }
  return true;
}
