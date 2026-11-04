import type { GameState, Selection } from './state.ts';
import { MAX_ELAPSED, MAX_MOVES, MISMATCH_MS, isWon } from './state.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
export function isInteger(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
}
export function validateMatched(value: unknown, deck: readonly number[]): value is number[] {
  if (!Array.isArray(value) || !value.every((i: unknown) => isInteger(i, deck.length - 1))) return false;
  if (new Set(value).size !== value.length) return false;
  const counts = new Map<number, number>();
  for (const index of value) {
    const face = deck[Number(index)];
    if (face === undefined) return false;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every(count => count === 2);
}
export function validateSelection(value: unknown, state: GameState): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (i: unknown): i is number => isInteger(i, state.board.deck.length - 1) && !state.matched.includes(i);
  switch (value.kind) {
    case 'closed': return exactKeys(value, ['kind']) ? { kind: 'closed' } : null;
    case 'one': return exactKeys(value, ['kind', 'index']) && eligible(value.index) ? { kind: 'one', index: value.index } : null;
    case 'mismatch': {
      const { first, second, remainingMs } = value;
      return exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) && eligible(first) && eligible(second)
        && first !== second && state.board.deck[first] !== state.board.deck[second]
        && isInteger(remainingMs, MISMATCH_MS) && remainingMs > 0
        ? { kind: 'mismatch', first, second, remainingMs } : null;
    }
    default: return null;
  }
}
export function validProgress(state: GameState): boolean {
  if (!isInteger(state.moves, MAX_MOVES) || !isInteger(state.elapsedMs, MAX_ELAPSED)) return false;
  if (state.moves < state.matched.length / 2 + (state.selection.kind === 'mismatch' ? 1 : 0)) return false;
  if (isWon(state) && state.selection.kind !== 'closed') return false;
  if (!state.started) return state.moves === 0 && state.elapsedMs === 0 && state.matched.length === 0 && state.selection.kind === 'closed';
  return state.moves !== 0 || state.selection.kind === 'one';
}
