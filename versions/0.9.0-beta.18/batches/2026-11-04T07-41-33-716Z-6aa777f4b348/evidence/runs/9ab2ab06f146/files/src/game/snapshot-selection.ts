import { CLOSED, KIND, MISMATCH_MS } from './state.ts';
import type { Selection } from './state.ts';
import { exactKeys, integer, isRecord } from './validation.ts';

export function decodeSelection(value: unknown, deck: readonly number[], matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number =>
    integer(index, deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case KIND.closed:
      return exactKeys(value, ['kind']) ? CLOSED : null;
    case KIND.one:
      return exactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: KIND.one, index: value.index } : null;
    case KIND.mismatch:
      return exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) &&
        eligible(value.first) && eligible(value.second) && value.first !== value.second &&
        deck[value.first] !== deck[value.second] && integer(value.remainingMs, MISMATCH_MS) && value.remainingMs >= 1
        ? { kind: KIND.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs } : null;
    default:
      return null;
  }
}

export function decodeMatched(value: unknown, deck: readonly number[]): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const positions: number[] = [];
  const counts = new Map<number, number>();
  for (const item of value) {
    const index: unknown = item;
    if (!integer(index, deck.length - 1) || positions.includes(index)) return null;
    const face = deck[index];
    if (face === undefined) return null;
    positions.push(index);
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every(count => count === 2) ? positions : null;
}
