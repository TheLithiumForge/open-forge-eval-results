import { parseBoardCode } from "./boardCode.ts";
import type { BoardDefinition } from "./model.ts";

const MODULUS = 2_147_483_647;
const RANGE = MODULUS - 1;

export function generateDeck(board: BoardDefinition): readonly number[] {
  let state = board.seed;
  const draw = (bound: number): number => {
    const limit = Math.floor(RANGE / bound) * bound;
    for (;;) {
      state = (state * 16_807) % MODULUS;
      const value = state - 1;
      if (value < limit) return value % bound;
    }
  };

  const deck = Array.from({ length: (board.side * board.side) / 2 }, (_, face) => [face, face]).flat();
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = draw(index + 1);
    [deck[index], deck[other]] = [deck[other]!, deck[index]!];
  }
  return Object.freeze(deck);
}

export function deckForBoardCode(code: string): readonly number[] | null {
  const board = parseBoardCode(code);
  return board ? generateDeck(board) : null;
}
