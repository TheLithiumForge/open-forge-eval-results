import { hasExactKeys, isPosition, isRecord, isNonnegativeInteger } from './json-input.ts';
import { CLOSED, MISMATCH_MS, SELECTION_KINDS } from './selection.ts';
import type { Selection } from './selection.ts';

export function decodeSelection(value: unknown, deck: readonly number[], matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number => isPosition(index, deck.length) && !matched.includes(index);
  switch (value.kind) {
    case SELECTION_KINDS.closed:
      return hasExactKeys(value, ['kind']) ? CLOSED : null;
    case SELECTION_KINDS.one:
      return hasExactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: SELECTION_KINDS.one, index: value.index }
        : null;
    case SELECTION_KINDS.mismatch:
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !eligible(value.first) || !eligible(value.second) || value.first === value.second ||
          deck[value.first] === deck[value.second] || !isNonnegativeInteger(value.remainingMs) ||
          value.remainingMs < 1 || value.remainingMs > MISMATCH_MS) return null;
      return { kind: SELECTION_KINDS.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs };
    default:
      return null;
  }
}
