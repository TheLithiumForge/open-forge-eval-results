import { parseBoardCode } from "../board.ts";
import type { BoardSize } from "../types.ts";

const seedLimit = 2_147_483_646;

export function freshBoardCode(size: BoardSize, currentCode?: string): string {
  let seed = Math.floor(Math.random() * seedLimit) + 1;
  const current = currentCode === undefined ? null : parseBoardCode(currentCode);
  if (current?.size === size && current.seed === seed) seed = seed === seedLimit ? 1 : seed + 1;
  return `np1-${size}-${seed}`;
}

export function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
