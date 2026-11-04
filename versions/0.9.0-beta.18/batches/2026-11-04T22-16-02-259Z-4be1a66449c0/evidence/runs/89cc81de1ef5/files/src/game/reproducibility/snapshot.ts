import { MISMATCH_MS, MOVE_CAP, SNAPSHOT_BYTE_LIMIT, TIME_CAP } from '../constants.ts';
import { createGame, isWon, matchedPairs, type GameState, type Selection } from '../core.ts';

const SNAPSHOT_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function nonnegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseSelection(value: unknown, game: GameState): Selection | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'closed') return hasExactKeys(value, ['kind']) ? { kind: 'closed' } : null;
  if (value.kind === 'one') {
    if (!hasExactKeys(value, ['kind', 'index']) || !Number.isSafeInteger(value.index)) return null;
    const index = value.index as number;
    if (index < 0 || index >= game.deck.length || game.matched.includes(index)) return null;
    return { kind: 'one', index };
  }
  if (value.kind === 'mismatch') {
    if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])) return null;
    const { first, second, remainingMs } = value;
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(second)) return null;
    if (!Number.isSafeInteger(remainingMs) || (remainingMs as number) < 1 || (remainingMs as number) > MISMATCH_MS) return null;
    const firstIndex = first as number;
    const secondIndex = second as number;
    if (firstIndex < 0 || secondIndex < 0 || firstIndex >= game.deck.length || secondIndex >= game.deck.length) return null;
    if (firstIndex === secondIndex || game.matched.includes(firstIndex) || game.matched.includes(secondIndex)) return null;
    if (game.deck[firstIndex] === game.deck[secondIndex]) return null;
    return { kind: 'mismatch', first: firstIndex, second: secondIndex, remainingMs: remainingMs as number };
  }
  return null;
}

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.boardCode,
    matched: state.matched,
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > SNAPSHOT_BYTE_LIMIT) return null;
  let value: unknown;
  try { value = JSON.parse(text) as unknown; } catch { return null; }
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])) return null;
  if (value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string') return null;
  if (!Array.isArray(value.matched) || !nonnegativeSafeInteger(value.moves) || value.moves > MOVE_CAP) return null;
  if (!nonnegativeSafeInteger(value.elapsedMs) || value.elapsedMs > TIME_CAP || typeof value.started !== 'boolean') return null;
  const game = createGame(value.boardCode);
  if (game === null) return null;
  const matched: number[] = [];
  const seen = new Set<number>();
  const counts = new Map<number, number>();
  for (const index of value.matched) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= game.deck.length || seen.has(index)) return null;
    seen.add(index);
    matched.push(index);
    const face = game.deck[index];
    if (face === undefined) return null;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  if ([...counts.values()].some((count) => count !== 2)) return null;
  const withMatches: GameState = { ...game, matched };
  const selection = parseSelection(value.selection, withMatches);
  if (selection === null) return null;
  const pairCount = matchedPairs(withMatches);
  const pendingMove = selection.kind === 'mismatch' ? 1 : 0;
  if (value.moves < pairCount + pendingMove) return null;
  if (!value.started) {
    if (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed') return null;
  } else if (value.moves === 0 && selection.kind !== 'one') return null;
  const restored = { ...withMatches, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
  if (isWon(restored) && selection.kind !== 'closed') return null;
  return restored;
}
