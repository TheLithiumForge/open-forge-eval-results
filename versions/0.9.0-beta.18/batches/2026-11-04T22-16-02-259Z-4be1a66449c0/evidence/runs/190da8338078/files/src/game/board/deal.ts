import { isBoardSize, MAX_SEED, type Board, type BoardSize } from '../types.ts';

const MODULUS = 2_147_483_647;
const RANGE = MODULUS - 1;
const BOARD_CODE = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/;

export function parseBoardCode(value: unknown): Board | null {
  if (typeof value !== 'string' || value.length > 32) return null;
  const match = BOARD_CODE.exec(value);
  if (!match) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code: value, size, seed, deck: makeDeck(size, seed) });
}

function makeDeck(size: BoardSize, seed: number): readonly number[] {
  const cards = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  let state = seed;
  const draw = (bound: number): number => {
    const limit = Math.floor(RANGE / bound) * bound;
    let sample: number;
    do {
      state = (state * 16_807) % MODULUS;
      sample = state - 1;
    } while (sample >= limit);
    return sample % bound;
  };
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const other = draw(index + 1);
    const current = cards[index];
    const replacement = cards[other];
    if (current === undefined || replacement === undefined) throw new RangeError('Shuffle index is outside the deck.');
    cards[index] = replacement;
    cards[other] = current;
  }
  return Object.freeze(cards);
}
