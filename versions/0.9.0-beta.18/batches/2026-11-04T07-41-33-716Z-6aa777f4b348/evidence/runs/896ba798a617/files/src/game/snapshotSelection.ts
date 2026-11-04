import { MISMATCH_MS } from './activateCard.ts';
import { hasExactKeys, isRecord, isSafeInteger } from './formatInput.ts';
import { CLOSED_SELECTION } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function decodeSelection(value: unknown, state: GameState): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number =>
    isSafeInteger(index, state.deck.length - 1) && !state.matched.includes(index);
  switch (value.kind) {
    case 'closed': return hasExactKeys(value, ['kind']) ? CLOSED_SELECTION : null;
    case 'one':
      return hasExactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: 'one', index: value.index } : null;
    case 'mismatch': {
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])
        || !eligible(value.first) || !eligible(value.second) || value.first === value.second
        || state.deck[value.first] === state.deck[value.second]
        || !isSafeInteger(value.remainingMs, MISMATCH_MS) || value.remainingMs < 1) return null;
      return { kind: 'mismatch', first: value.first, second: value.second, remainingMs: value.remainingMs };
    }
    default: return null;
  }
}
