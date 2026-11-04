import { BOARD_SIZES, CLOSED, type BoardSize, type GameState } from "./types.ts";

export const MAX_SEED = 2_147_483_646;
const MODULUS = 2_147_483_647;
const MULTIPLIER = 16_807;

export type ParsedBoardCode = {
  readonly boardCode: string;
  readonly size: BoardSize;
  readonly seed: number;
};

export function parseBoardCode(input: string): ParsedBoardCode | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(input);
  if (!match) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return { boardCode: input, size, seed };
}

export function isBoardSize(value: number): value is BoardSize {
  return (BOARD_SIZES as readonly number[]).includes(value);
}

export function makeBoardCode(size: BoardSize, seed: number): string {
  return "np1-" + size + "-" + seed;
}

export function generateDeck(size: BoardSize, seed: number): number[] {
  const deck: number[] = [];
  for (let face = 0; face < (size * size) / 2; face += 1) deck.push(face, face);
  let state = seed;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const choices = index + 1;
    const limit = Math.floor(2_147_483_646 / choices) * choices;
    let sample: number;
    do {
      state = (state * MULTIPLIER) % MODULUS;
      sample = state - 1;
    } while (sample >= limit);
    const other = sample % choices;
    const value = deck[index];
    const swap = deck[other];
    if (value === undefined || swap === undefined) throw new Error("Invalid shuffle index.");
    deck[index] = swap;
    deck[other] = value;
  }
  return deck;
}

export function createGame(boardCode: string): GameState | null {
  const parsed = parseBoardCode(boardCode);
  if (!parsed) return null;
  return {
    boardCode: parsed.boardCode,
    size: parsed.size,
    deck: Object.freeze(generateDeck(parsed.size, parsed.seed)),
    matched: [],
    selection: CLOSED,
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}
