import { hasKeys, isInteger, isRecord } from './validation.ts';
import { MISMATCH_MS, SELECTION } from './state.ts';
import type { GameState, Selection } from './state.ts';

export function decodeSelection(value: unknown, state: GameState): Selection | null {
  if (!isRecord(value)) return null;
  const validIndex = (index: unknown): index is number =>
    isInteger(index, state.board.deck.length - 1) && !state.matched.includes(index);
  switch (value.kind) {
    case SELECTION.closed:
      return hasKeys(value, ['kind']) ? { kind: SELECTION.closed } : null;
    case SELECTION.one:
      return hasKeys(value, ['kind', 'index']) && validIndex(value.index)
        ? { kind: SELECTION.one, index: value.index } : null;
    case SELECTION.mismatch:
      if (!hasKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !validIndex(value.first) || !validIndex(value.second) || value.first === value.second ||
          state.board.deck[value.first] === state.board.deck[value.second] ||
          !isInteger(value.remainingMs, MISMATCH_MS) || value.remainingMs < 1) return null;
      return { kind: SELECTION.mismatch, first: value.first, second: value.second,
        remainingMs: value.remainingMs };
    default: return null;
  }
}
