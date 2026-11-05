import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { isJsonObject } from '../saved-format.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { nameError, normalizeName, roundSize } from './tournament.ts';
import type { TournamentState } from './tournament.ts';

interface Score {
  moves: number;
  elapsedMs: number;
}
interface Exchange {
  tournament: TournamentState | null;
  snapshot: string | null;
}
const invalid = { error: 'Invalid tournament.' };
function extra(value: Record<string, unknown>, allowed: string[]): string | undefined {
  return Object.keys(value).find((key) => !allowed.includes(key));
}
function scoreValue(value: unknown, size: number): Score | null | undefined {
  if (value === null) return null;
  if (
    !isJsonObject(value) ||
    typeof value.moves !== 'number' ||
    !Number.isSafeInteger(value.moves) ||
    value.moves < size ** 2 / 2 ||
    value.moves > MOVES_MAX ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { moves: value.moves, elapsedMs: value.elapsedMs };
}
export function decodeExchange(text: string): { value?: Exchange; error?: string } {
  if (new TextEncoder().encode(text).length > 262144) return invalid;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return invalid;
  }
  if (!isJsonObject(data)) return invalid;
  let field = extra(data, ['format', 'version', 'tournament', 'snapshot']);
  if (field !== undefined) return { error: `Unknown field: ${field}.` };
  if (
    data.format !== 'neon-pairs/tournament' ||
    data.version !== 1 ||
    !('snapshot' in data) ||
    !('tournament' in data)
  )
    return invalid;
  if (data.tournament === null)
    return data.snapshot === null ? { value: { tournament: null, snapshot: null } } : invalid;
  const t = data.tournament;
  if (!isJsonObject(t)) return invalid;
  field = extra(t, ['names', 'matches', 'current', 'phase']);
  if (field !== undefined) return { error: `Unknown field: ${field}.` };
  if (
    !Array.isArray(t.names) ||
    ![4, 8].includes(t.names.length) ||
    !t.names.every((n): n is string => typeof n === 'string' && n === normalizeName(n)) ||
    nameError(t.names)
  )
    return invalid;
  if (
    !Array.isArray(t.matches) ||
    t.matches.length !== t.names.length - 1 ||
    typeof t.current !== 'number' ||
    !Number.isInteger(t.current) ||
    t.current < 0 ||
    t.current >= t.matches.length
  )
    return invalid;
  if (
    t.phase !== 'ready' &&
    t.phase !== 'playing' &&
    t.phase !== 'turnComplete' &&
    t.phase !== 'matchComplete' &&
    t.phase !== 'complete'
  )
    return invalid;
  const current = t.current;
  const count = t.names.length;
  const seen = new Set<string>();
  const expected: [number | null, number | null][] =
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
  while (expected.length < count - 1) expected.push([null, null]);
  const matches: TournamentState['matches'] = [];
  for (let i = 0; i < t.matches.length; i++) {
    const m: unknown = t.matches[i];
    if (!isJsonObject(m)) return invalid;
    field = extra(m, ['code', 'players', 'scores', 'winner']);
    if (field !== undefined) return { error: `Unknown field: ${field}.` };
    if (
      typeof m.code !== 'string' ||
      parseBoardCode(m.code)?.size !== roundSize(count, i) ||
      seen.has(m.code)
    )
      return invalid;
    seen.add(m.code);
    if (
      !Array.isArray(m.players) ||
      m.players.length !== 2 ||
      m.players.some((p, j) => p !== expected[i]![j]) ||
      !Array.isArray(m.scores) ||
      m.scores.length !== 2
    )
      return invalid;
    for (const score of m.scores) {
      if (isJsonObject(score)) {
        field = extra(score, ['moves', 'elapsedMs']);
        if (field !== undefined) return { error: `Unknown field: ${field}.` };
      }
    }
    const a = scoreValue(m.scores[0], roundSize(count, i));
    const b = scoreValue(m.scores[1], roundSize(count, i));
    if (a === undefined || b === undefined || (b && !a)) return invalid;
    const needed =
      i < current
        ? 2
        : i > current
          ? 0
          : t.phase === 'complete' || t.phase === 'matchComplete'
            ? 2
            : t.phase === 'turnComplete'
              ? 1
              : null;
    const n = Number(a !== null) + Number(b !== null);
    if (
      (needed !== null && n !== needed) ||
      (i === current && (t.phase === 'ready' || t.phase === 'playing') && n > 1)
    )
      return invalid;
    const players = expected[i]!;
    let winner: number | null = null;
    if (a && b) {
      if (players[0] === null || players[1] === null) return invalid;
      winner =
        a.moves < b.moves ||
        (a.moves === b.moves &&
          (a.elapsedMs < b.elapsedMs || (a.elapsedMs === b.elapsedMs && players[0] < players[1])))
          ? players[0]
          : players[1];
      if (i < count - 2) {
        const dest = i < count / 2 ? count / 2 + Math.floor(i / 2) : count - 2;
        expected[dest]![i % 2] = winner;
      }
    }
    if (m.winner !== winner) return invalid;
    matches.push({ code: m.code, players: [players[0], players[1]], scores: [a, b], winner });
  }
  if (
    (t.phase === 'complete') !== (current === count - 2 && matches[current]!.winner !== null) ||
    (t.phase === 'matchComplete' && current === count - 2)
  )
    return invalid;
  let snapshot: string | null = null;
  if (t.phase === 'playing') {
    if (typeof data.snapshot !== 'string') return invalid;
    const game = decodeSnapshot(data.snapshot);
    if (
      !game ||
      game.boardCode !== matches[current]!.code ||
      game.matched.length === game.deck.length
    )
      return invalid;
    snapshot = data.snapshot;
  } else if (data.snapshot !== null) return invalid;
  return { value: { tournament: { names: t.names, matches, current, phase: t.phase }, snapshot } };
}
