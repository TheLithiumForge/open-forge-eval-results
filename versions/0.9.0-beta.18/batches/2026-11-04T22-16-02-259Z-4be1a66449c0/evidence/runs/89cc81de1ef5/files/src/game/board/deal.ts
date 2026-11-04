import { isBoardSize, MAX_SEED, type BoardSize } from '../constants.ts';

const MODULUS = 2147483647;
const GENERATOR_FACTOR = 16807;
const RNG_RANGE = MODULUS - 1;

export interface BoardDescription {
  readonly boardCode: string;
  readonly size: BoardSize;
  readonly seed: number;
}

export function parseBoardCode(text: string): BoardDescription | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(text);
  if (match === null) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return { boardCode: `np1-${size}-${seed}`, size, seed };
}

export function createDeck(size: BoardSize, seed: number): readonly number[] {
  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  let state = seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const bound = index + 1;
    const limit = Math.floor(RNG_RANGE / bound) * bound;
    let x: number;
    do {
      state = (state * GENERATOR_FACTOR) % MODULUS;
      x = state - 1;
    } while (x >= limit);
    const target = x % bound;
    const currentValue = deck[index];
    const targetValue = deck[target];
    if (currentValue === undefined || targetValue === undefined) throw new Error('Invalid shuffle index');
    deck[index] = targetValue;
    deck[target] = currentValue;
  }
  return deck;
}

export function createGameDescription(boardCode: string): BoardDescription | null {
  return parseBoardCode(boardCode);
}
