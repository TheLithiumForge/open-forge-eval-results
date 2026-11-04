import { hasExactKeys, isRecord, isSafeNonnegative } from './formatValidation.ts';
import { CLOSED, MISMATCH_MS, SELECTION_KIND } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function isPosition(value: unknown, length: number): value is number {
  return isSafeNonnegative(value) && value < length;
}

export function decodeSelection(value: unknown, game: GameState, matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number => isPosition(index, game.board.deck.length) && !matched.includes(index);
  switch (value.kind) {
    case SELECTION_KIND.closed:
      return hasExactKeys(value, ['kind']) ? CLOSED : null;
    case SELECTION_KIND.one:
      return hasExactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: SELECTION_KIND.one, index: value.index } : null;
    case SELECTION_KIND.mismatch:
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !eligible(value.first) || !eligible(value.second) || value.first === value.second ||
          game.board.deck[value.first] === game.board.deck[value.second] ||
          !isSafeNonnegative(value.remainingMs) || value.remainingMs < 1 || value.remainingMs > MISMATCH_MS) return null;
      return { kind: SELECTION_KIND.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs };
    default:
      return null;
  }
}

export function decodeMatched(value: unknown, game: GameState): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const entries: readonly unknown[] = value;
  const matched: number[] = [];
  const faceCounts = new Map<number, number>();
  for (const index of entries) {
    if (!isPosition(index, game.board.deck.length) || matched.includes(index)) return null;
    const face = game.board.deck[index];
    if (face === undefined) return null;
    matched.push(index);
    faceCounts.set(face, (faceCounts.get(face) ?? 0) + 1);
  }
  return [...faceCounts.values()].every(count => count === 2) ? matched : null;
}
