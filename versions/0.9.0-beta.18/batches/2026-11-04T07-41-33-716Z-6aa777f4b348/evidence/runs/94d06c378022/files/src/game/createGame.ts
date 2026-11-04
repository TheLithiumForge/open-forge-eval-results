import { parseBoardCode } from './board.ts';
import type { GameState } from './state.ts';
import { makeGameState } from './state.ts';

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  return board === null ? null : makeGameState(board);
}
