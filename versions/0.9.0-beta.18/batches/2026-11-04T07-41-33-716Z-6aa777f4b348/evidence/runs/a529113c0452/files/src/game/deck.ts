import type { BoardCode } from './boardCode.ts';
import { boundedRandom } from './random.ts';

export type Board = BoardCode & Readonly<{ deck: readonly number[] }>;

export function generateBoard(description: BoardCode): Board {
  const deck = Array.from({ length: description.size ** 2 }, (_, index) => Math.floor(index / 2));
  let state = description.seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const draw = boundedRandom(state, index + 1);
    state = draw.state;
    const first = deck[index];
    const second = deck[draw.value];
    if (first === undefined || second === undefined) throw new Error('Invalid shuffle position.');
    deck[index] = second;
    deck[draw.value] = first;
  }
  return Object.freeze({ ...description, deck: Object.freeze(deck) });
}
