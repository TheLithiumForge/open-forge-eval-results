import { SELECTION } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { MISMATCH_MS } from './transitions.ts';
import { exactKeys, isIndex, isNonnegativeInteger, isObject } from './validation.ts';

export function decodeSelection(value: unknown, game: GameState, matched: readonly number[]): Selection | null {
  if (!isObject(value)) return null;
  const eligible = (index: unknown): index is number => isIndex(index, game.board.deck.length) && !matched.includes(index);
  switch (value.kind) {
    case SELECTION.closed:
      return exactKeys(value, ['kind']) ? { kind: SELECTION.closed } : null;
    case SELECTION.one:
      return exactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: SELECTION.one, index: value.index } : null;
    case SELECTION.mismatch:
      if (!exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) || !eligible(value.first) ||
          !eligible(value.second) || value.first === value.second ||
          game.board.deck[value.first] === game.board.deck[value.second] ||
          !isNonnegativeInteger(value.remainingMs) || value.remainingMs < 1 || value.remainingMs > MISMATCH_MS) return null;
      return { kind: SELECTION.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs };
    default:
      return null;
  }
}

export function decodeMatched(value: unknown, game: GameState): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const input: readonly unknown[] = value;
  const matched: number[] = [];
  for (const index of input) {
    if (!isIndex(index, game.board.deck.length) || matched.includes(index)) return null;
    matched.push(index);
  }
  const faces = new Map<number, number>();
  for (const index of matched) {
    const face = game.board.deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
  }
  return [...faces.values()].every((count) => count === 2) ? matched : null;
}
