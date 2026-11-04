import { hasExactKeys, isNonnegativeInteger, isRecord } from './validation.ts';
import { MISMATCH_MS } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function decodeSelection(value: unknown, state: GameState, matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number =>
    isNonnegativeInteger(index, state.deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case 'closed': return hasExactKeys(value, ['kind']) ? { kind: 'closed' } : null;
    case 'one':
      return hasExactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: 'one', index: value.index } : null;
    case 'mismatch':
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])
        || !eligible(value.first) || !eligible(value.second) || value.first === value.second
        || state.deck[value.first] === state.deck[value.second]
        || !isNonnegativeInteger(value.remainingMs, MISMATCH_MS) || value.remainingMs < 1) return null;
      return { kind: 'mismatch', first: value.first, second: value.second, remainingMs: value.remainingMs };
    default: return null;
  }
}
