import { hasExactKeys, isNonnegativeSafeInteger } from './formats.ts';
import { SELECTION_KINDS } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { MISMATCH_MS } from './transitions.ts';

export function decodeSelection(
  value: unknown,
  game: GameState,
  matched: readonly number[],
): Selection | null {
  const eligible = (index: unknown): index is number => isNonnegativeSafeInteger(index)
    && index < game.board.deck.length && !matched.includes(index);
  if (hasExactKeys(value, ['kind']) && value.kind === SELECTION_KINDS.closed) {
    return { kind: SELECTION_KINDS.closed };
  }
  if (hasExactKeys(value, ['kind', 'index']) && value.kind === SELECTION_KINDS.one
    && eligible(value.index)) return { kind: SELECTION_KINDS.one, index: value.index };
  if (hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])
    && value.kind === SELECTION_KINDS.mismatch && eligible(value.first)
    && eligible(value.second) && value.first !== value.second
    && game.board.deck[value.first] !== game.board.deck[value.second]
    && isNonnegativeSafeInteger(value.remainingMs) && value.remainingMs >= 1
    && value.remainingMs <= MISMATCH_MS) {
    return {
      kind: SELECTION_KINDS.mismatch, first: value.first, second: value.second,
      remainingMs: value.remainingMs,
    };
  }
  return null;
}
