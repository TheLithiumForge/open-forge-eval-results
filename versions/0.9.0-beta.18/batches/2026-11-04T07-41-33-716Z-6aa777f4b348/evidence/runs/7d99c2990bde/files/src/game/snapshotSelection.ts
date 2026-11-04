import { hasExactKeys, isObject, isSafeInteger } from './json.ts';
import { MISMATCH_MS, selectionKinds } from './state.ts';
import type { Selection } from './state.ts';

export function decodeSelection(value: unknown, deck: readonly number[], matched: readonly number[]): Selection | null {
  if (!isObject(value)) return null;
  const eligible = (index: unknown): index is number =>
    isSafeInteger(index, deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case selectionKinds.closed:
      return hasExactKeys(value, ['kind']) ? { kind: selectionKinds.closed } : null;
    case selectionKinds.one:
      return hasExactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: selectionKinds.one, index: value.index } : null;
    case selectionKinds.mismatch:
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !eligible(value.first) || !eligible(value.second) || value.first === value.second ||
          deck[value.first] === deck[value.second] || !isSafeInteger(value.remainingMs, MISMATCH_MS) ||
          value.remainingMs === 0) return null;
      return { kind: selectionKinds.mismatch, first: value.first,
        second: value.second, remainingMs: value.remainingMs };
    default: return null;
  }
}
