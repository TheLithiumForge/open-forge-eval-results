import type { BoardDescription } from './boardCode.ts';

const MODULUS = 2147483647;
const MULTIPLIER = 16807;
const GENERATOR_VALUES = MODULUS - 1;

export function nextRandomState(state: number): number {
  return (state * MULTIPLIER) % MODULUS;
}

export function generateDeck(board: BoardDescription): readonly number[] {
  const deck = Array.from({ length: board.size * board.size }, (_, i) => Math.floor(i / 2));
  let randomState = board.seed;
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const possibilities = i + 1;
    const limit = Math.floor(GENERATOR_VALUES / possibilities) * possibilities;
    let draw: number;
    do {
      randomState = nextRandomState(randomState);
      draw = randomState - 1;
    } while (draw >= limit);
    const j = draw % possibilities;
    const atI = deck[i];
    const atJ = deck[j];
    if (atI === undefined || atJ === undefined) throw new Error('Invalid shuffle index.');
    deck[i] = atJ;
    deck[j] = atI;
  }
  return Object.freeze(deck);
}
