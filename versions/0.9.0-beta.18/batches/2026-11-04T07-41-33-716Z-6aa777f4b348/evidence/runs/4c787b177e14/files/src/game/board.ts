import { BOARD_VERSION, PARK_MILLER_MODULUS, SUPPORTED_SIZES } from "./constants.ts";
import { SELECTION_KIND, type BoardDescription, type GridSize, type GameState } from "./types.ts";

export { SUPPORTED_SIZES } from "./constants.ts";

const isGridSize = (value: number): value is GridSize =>
  SUPPORTED_SIZES.some((size) => size === value);

export function parseBoardCode(text: string): BoardDescription | null {
  const match = /^(np1)-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(text);
  if (!match || match[0] !== text) return null;
  const version = match[1];
  const sizeText = match[2];
  const seedText = match[3];
  if (!version || !sizeText || !seedText) return null;
  const size = Number(sizeText);
  const seed = Number(seedText);
  if (!isGridSize(size) || !Number.isSafeInteger(seed) || seed > PARK_MILLER_MODULUS - 1) return null;
  const code = `${version}-${size}-${seed}`;
  return Object.freeze({ code, size, seed, deck: Object.freeze(createDeck(size, seed)) });
}

function createDeck(size: GridSize, seed: number): number[] {
  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  let state = seed;
  const drawIndex = (bound: number): number => {
    const choices = PARK_MILLER_MODULUS - 1;
    const limit = Math.floor(choices / bound) * bound;
    let value = limit;
    while (value >= limit) {
      state = (state * 16_807) % PARK_MILLER_MODULUS;
      value = state - 1;
    }
    return value % bound;
  };
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = drawIndex(index + 1);
    const currentFace = deck[index];
    const otherFace = deck[other];
    if (currentFace !== undefined && otherFace !== undefined) {
      deck[index] = otherFace;
      deck[other] = currentFace;
    }
  }
  return deck;
}

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (!board) return null;
  return Object.freeze({
    board,
    matched: Object.freeze([]),
    selection: Object.freeze({ kind: SELECTION_KIND.CLOSED }),
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
}
