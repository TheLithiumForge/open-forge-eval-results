import { hasExactKeys, isNonnegativeInteger, isRecord } from './formatInput.ts';
import { MISMATCH_MS, SELECTION } from './selection.ts';
import type { Selection } from './selection.ts';
import type { GameState } from './state.ts';

export function decodeSelection(value: unknown, state: GameState): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number => isNonnegativeInteger(index)
    && index < state.board.deck.length && !state.matched.includes(index);
  switch (value.kind) {
    case SELECTION.closed:
      return hasExactKeys(value, ['kind']) ? { kind: SELECTION.closed } : null;
    case SELECTION.one:
      return hasExactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: SELECTION.one, index: value.index } : null;
    case SELECTION.mismatch:
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])) return null;
      if (!eligible(value.first) || !eligible(value.second) || value.first === value.second) return null;
      if (state.board.deck[value.first] === state.board.deck[value.second]) return null;
      if (!isNonnegativeInteger(value.remainingMs)
        || value.remainingMs < 1 || value.remainingMs > MISMATCH_MS) return null;
      return {
        kind: SELECTION.mismatch, first: value.first, second: value.second,
        remainingMs: value.remainingMs,
      };
    default:
      return null;
  }
}
