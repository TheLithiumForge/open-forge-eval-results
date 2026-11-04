import { hasExactKeys, isNonnegativeInteger, isRecord } from './jsonInput.ts';
import { MISMATCH_MS } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function isPosition(value: unknown, length: number): value is number {
  return isNonnegativeInteger(value) && value < length;
}

export function decodeSelection(value: unknown, state: GameState): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number =>
    isPosition(index, state.deck.length) && !state.matched.includes(index);
  switch (value.kind) {
    case 'closed':
      return hasExactKeys(value, ['kind']) ? { kind: 'closed' } : null;
    case 'one':
      return hasExactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: 'one', index: value.index } : null;
    case 'mismatch': {
      const { first, second, remainingMs } = value;
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !eligible(first) || !eligible(second) || first === second ||
          state.deck[first] === state.deck[second] || !isNonnegativeInteger(remainingMs) ||
          remainingMs < 1 || remainingMs > MISMATCH_MS) return null;
      return { kind: 'mismatch', first, second, remainingMs };
    }
    default:
      return null;
  }
}
