import { hasKeys, isNatural, isRecord } from './json.ts';
import { selectionKinds } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { mismatchMs } from './turn.ts';

export function decodeSelection(value: unknown, state: GameState): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number => isNatural(index) &&
    index < state.board.deck.length && !state.matched.includes(index);
  switch (value.kind) {
    case selectionKinds.closed:
      return hasKeys(value, ['kind']) ? { kind: selectionKinds.closed } : null;
    case selectionKinds.one:
      return hasKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: selectionKinds.one, index: value.index } : null;
    case selectionKinds.mismatch:
      if (!hasKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
        !eligible(value.first) || !eligible(value.second) || value.first === value.second ||
        state.board.deck[value.first] === state.board.deck[value.second] ||
        !isNatural(value.remainingMs) || value.remainingMs < 1 || value.remainingMs > mismatchMs) return null;
      return { kind: selectionKinds.mismatch, first: value.first,
        second: value.second, remainingMs: value.remainingMs };
    default: return null;
  }
}
