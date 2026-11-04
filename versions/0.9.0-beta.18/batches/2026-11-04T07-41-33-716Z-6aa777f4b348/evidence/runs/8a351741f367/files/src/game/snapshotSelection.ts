import { exactKeys, isRecord, nonnegativeInteger } from './formatValidation.ts';
import type { GameState, Selection } from './state.ts';
import { MISMATCH_MS } from './transitions.ts';

export function readSelection(value: unknown, game: GameState, matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number =>
    nonnegativeInteger(index, game.deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case 'closed': return exactKeys(value, ['kind']) ? { kind: 'closed' } : null;
    case 'one': return exactKeys(value, ['kind', 'index']) && eligible(value.index)
      ? { kind: 'one', index: value.index } : null;
    case 'mismatch': {
      if (!exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !eligible(value.first) || !eligible(value.second) || value.first === value.second ||
          game.deck[value.first] === game.deck[value.second] ||
          !nonnegativeInteger(value.remainingMs, MISMATCH_MS) || value.remainingMs < 1) return null;
      return { kind: 'mismatch', first: value.first, second: value.second, remainingMs: value.remainingMs };
    }
    default: return null;
  }
}
