import { CLOSED_SELECTION, MISMATCH_MS, SELECTION } from './selection.ts';
import type { Selection } from './selection.ts';
import type { GameState } from './state.ts';
import { hasExactKeys, isInteger, isRecord } from './validation.ts';

export function decodeSelection(value: unknown, game: GameState, matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const available = (index: unknown): index is number =>
    isInteger(index, game.board.deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case SELECTION.closed:
      return hasExactKeys(value, ['kind']) ? CLOSED_SELECTION : null;
    case SELECTION.one:
      return hasExactKeys(value, ['kind', 'index']) && available(value.index)
        ? Object.freeze({ kind: SELECTION.one, index: value.index }) : null;
    case SELECTION.mismatch:
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])
        || !available(value.first) || !available(value.second) || value.first === value.second
        || game.board.deck[value.first] === game.board.deck[value.second]
        || !isInteger(value.remainingMs, MISMATCH_MS) || value.remainingMs < 1) return null;
      return Object.freeze({ kind: SELECTION.mismatch, first: value.first,
        second: value.second, remainingMs: value.remainingMs });
    default: return null;
  }
}
