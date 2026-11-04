import { parseBoardCode } from "./board/code.ts";
import { createGameFromCode, type GameState } from "./state.ts";

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  return board === null ? null : createGameFromCode(board);
}
