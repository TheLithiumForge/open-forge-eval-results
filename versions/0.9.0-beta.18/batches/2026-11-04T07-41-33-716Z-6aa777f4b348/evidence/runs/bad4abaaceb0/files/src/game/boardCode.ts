import { GRID_SIZES, MAX_SEED, type GridSize } from "./constants.ts";
import { generateDeck } from "./deck.ts";
import type { BoardDescription } from "./state.ts";

const CODE_PATTERN = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/;

export function isGridSize(value: unknown): value is GridSize {
  return typeof value === "number" && GRID_SIZES.some((size) => size === value);
}

export function parseBoardCode(value: string): BoardDescription | null {
  const match = CODE_PATTERN.exec(value);
  if (!match || match[0] !== value) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isGridSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return { code: value, size, seed };
}

export function createBoard(value: string): { board: BoardDescription; deck: readonly number[] } | null {
  const board = parseBoardCode(value);
  return board ? { board, deck: generateDeck(board.size, board.seed) } : null;
}

