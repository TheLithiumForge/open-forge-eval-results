import { MISMATCH_MS } from './game.ts';
import { selectionKinds } from './state.ts';
import type { Selection } from './state.ts';
import { hasExactKeys, isPosition, isRecord, isUnknownArray } from './validation.ts';

export function decodeMatched(value: unknown, deck: readonly number[]): readonly number[] | null {
  if (!isUnknownArray(value)) return null;
  const matched: number[] = [];
  const faceCounts = new Map<number, number>();
  for (const index of value) {
    if (!isPosition(index, deck.length) || matched.includes(index)) return null;
    const face = deck[index];
    if (face === undefined) return null;
    matched.push(index);
    faceCounts.set(face, (faceCounts.get(face) ?? 0) + 1);
  }
  if ([...faceCounts.values()].some((count) => count !== 2)) return null;
  return matched;
}

export function decodeSelection(
  value: unknown, deck: readonly number[], matched: readonly number[],
): Selection | null {
  if (!isRecord(value)) return null;
  const available = (index: unknown): index is number =>
    isPosition(index, deck.length) && !matched.includes(index);
  switch (value.kind) {
    case selectionKinds.closed:
      return hasExactKeys(value, ['kind']) ? { kind: selectionKinds.closed } : null;
    case selectionKinds.one:
      return hasExactKeys(value, ['kind', 'index']) && available(value.index)
        ? { kind: selectionKinds.one, index: value.index } : null;
    case selectionKinds.mismatch: {
      const { first, second, remainingMs } = value;
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])
        || !available(first) || !available(second) || first === second
        || deck[first] === deck[second] || typeof remainingMs !== 'number'
        || !Number.isInteger(remainingMs) || remainingMs < 1 || remainingMs > MISMATCH_MS) return null;
      return { kind: selectionKinds.mismatch, first, second, remainingMs };
    }
    default:
      return null;
  }
}
