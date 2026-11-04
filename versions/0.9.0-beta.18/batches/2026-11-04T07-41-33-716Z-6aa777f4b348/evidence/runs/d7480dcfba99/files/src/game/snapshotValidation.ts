import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
export function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
}
export function validMatched(value: unknown, state: GameState): value is number[] {
  if (!Array.isArray(value)) return false;
  const indices: unknown[] = value;
  if (!indices.every(index => integer(index, state.board.deck.length - 1))) return false;
  if (new Set(indices).size !== indices.length) return false;
  const counts = new Map<number, number>();
  for (const index of indices) {
    if (typeof index !== 'number') return false;
    const face = state.board.deck[index];
    if (face === undefined) return false;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every(count => count === 2);
}
export function readSelection(value: unknown, state: GameState, matched: number[]): Selection | null {
  if (!object(value)) return null;
  const validIndex = (index: unknown): index is number =>
    integer(index, state.board.deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case 'closed': return exact(value, ['kind']) ? { kind: 'closed' } : null;
    case 'one': return exact(value, ['kind', 'index']) && validIndex(value.index)
      ? { kind: 'one', index: value.index } : null;
    case 'mismatch': {
      if (!exact(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !validIndex(value.first) || !validIndex(value.second) || value.first === value.second ||
          state.board.deck[value.first] === state.board.deck[value.second] ||
          !integer(value.remainingMs, MISMATCH_MS) || value.remainingMs === 0) return null;
      return { kind: 'mismatch', first: value.first, second: value.second, remainingMs: value.remainingMs };
    }
    default: return null;
  }
}
export function validProgress(value: Record<string, unknown>, matched: number[], selection: Selection): boolean {
  if (!integer(value.moves, MAX_MOVES) || !integer(value.elapsedMs, MAX_ELAPSED_MS) || typeof value.started !== 'boolean') return false;
  const minimumMoves = matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0);
  if (value.moves < minimumMoves) return false;
  if (!value.started) return value.moves === 0 && value.elapsedMs === 0 && matched.length === 0 && selection.kind === 'closed';
  return value.moves !== 0 || selection.kind === 'one';
}
