import { createBoardCode } from "../board-code";
import type { BoardSize } from "../constants";
import { createGame, type GameState } from "../game";

function randomSeed(): number {
  const range = 2_147_483_646;
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bound = Math.floor(0x1_0000_0000 / range) * range;
    const buffer = new Uint32Array(1);
    do { crypto.getRandomValues(buffer); } while (buffer[0]! >= bound);
    return (buffer[0]! % range) + 1;
  }
  return Math.floor(Math.random() * range) + 1;
}

export function freshGame(size: BoardSize, avoidCode?: string): GameState {
  let code = createBoardCode(size, randomSeed());
  while (code === avoidCode) code = createBoardCode(size, randomSeed());
  const game = createGame(code);
  if (game === null) throw new Error("Unable to create a game.");
  return game;
}
