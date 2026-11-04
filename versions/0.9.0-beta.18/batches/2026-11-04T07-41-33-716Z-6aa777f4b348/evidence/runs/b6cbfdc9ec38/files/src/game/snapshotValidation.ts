import { hasExactKeys, isNatural, isPosition, isRecord, isUnknownArray } from './json.ts';
import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION_KINDS } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function validateMatched(value: unknown, deck: readonly number[]): readonly number[] | null {
  if (!isUnknownArray(value)) return null;
  const indices: number[] = [];
  for (const index of value) {
    if (!isPosition(index, deck.length) || indices.includes(index)) return null;
    indices.push(index);
  }
  const faces = new Map<number, number>();
  for (const index of indices) {
    const face = deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
  }
  return [...faces.values()].every((count) => count === 2) ? indices : null;
}

export function validateSelection(
  value: unknown, deck: readonly number[], matched: readonly number[],
): Selection | null {
  if (!isRecord(value)) return null;
  const available = (index: unknown): index is number =>
    isPosition(index, deck.length) && !matched.includes(index);
  switch (value.kind) {
    case SELECTION_KINDS.closed:
      return hasExactKeys(value, ['kind']) ? { kind: SELECTION_KINDS.closed } : null;
    case SELECTION_KINDS.one:
      return hasExactKeys(value, ['kind', 'index']) && available(value.index)
        ? { kind: SELECTION_KINDS.one, index: value.index } : null;
    case SELECTION_KINDS.mismatch:
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])
        || !available(value.first) || !available(value.second) || value.first === value.second
        || deck[value.first] === deck[value.second] || !isNatural(value.remainingMs)
        || value.remainingMs < 1 || value.remainingMs > MISMATCH_MS) return null;
      return {
        kind: SELECTION_KINDS.mismatch, first: value.first,
        second: value.second, remainingMs: value.remainingMs,
      };
    default:
      return null;
  }
}

export function validateProgress(state: GameState): boolean {
  const { moves, elapsedMs, started, selection, matched } = state;
  if (!isNatural(moves) || moves > MAX_MOVES || !isNatural(elapsedMs)
    || elapsedMs > MAX_ELAPSED_MS) return false;
  const minimumMoves = matched.length / 2 + (selection.kind === SELECTION_KINDS.mismatch ? 1 : 0);
  if (moves < minimumMoves) return false;
  if (!started) {
    return moves === 0 && elapsedMs === 0 && matched.length === 0
      && selection.kind === SELECTION_KINDS.closed;
  }
  return moves !== 0 || selection.kind === SELECTION_KINDS.one;
}
