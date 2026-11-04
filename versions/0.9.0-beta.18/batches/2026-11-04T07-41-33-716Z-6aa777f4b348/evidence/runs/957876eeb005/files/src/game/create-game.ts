import { parseBoardCode } from './board-code.ts';
import { generateDeck } from './deck.ts';
import { CLOSED } from './selection.ts';
import type { GameState } from './state.ts';

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (board === null) return null;
  return {
    board,
    deck: generateDeck(board),
    matched: [],
    selection: CLOSED,
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}
