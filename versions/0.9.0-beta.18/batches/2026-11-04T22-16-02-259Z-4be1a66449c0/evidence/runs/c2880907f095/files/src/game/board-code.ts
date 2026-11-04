import { GRID_SIZES, MAX_SEED, PARK_MILLER_MODULUS } from './constants.ts';
import type { Board, GridSize } from './types.ts';

const BOARD_CODE_VERSION = 'np1';
const BOARD_CODE_PATTERN = new RegExp(`^${BOARD_CODE_VERSION}-(4|6|8|10|12|14|16)-([1-9][0-9]*)$`);

export function parseBoardCode(code: string): Board | null {
  const match = BOARD_CODE_PATTERN.exec(code);
  if (!match) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  const gridSize = GRID_SIZES.find((candidate) => candidate === size);
  if (gridSize === undefined || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size: gridSize, deck: Object.freeze(generateDeck(gridSize, seed)) });
}

export function generateDeck(size: GridSize, seed: number): number[] {
  let state = seed;
  const draw = (bound: number): number => {
    const range = PARK_MILLER_MODULUS - 1;
    const limit = Math.floor(range / bound) * bound;
    while (true) {
      state = (state * 16_807) % PARK_MILLER_MODULUS;
      const value = state - 1;
      if (value < limit) return value % bound;
    }
  };
  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = draw(index + 1);
    const currentValue = deck[index];
    const otherValue = deck[other];
    if (currentValue !== undefined && otherValue !== undefined) {
      deck[index] = otherValue;
      deck[other] = currentValue;
    }
  }
  return deck;
}
