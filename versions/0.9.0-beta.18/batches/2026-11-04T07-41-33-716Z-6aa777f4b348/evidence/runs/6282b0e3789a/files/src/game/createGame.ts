import { parseBoardCode } from './boardCode.ts';
import { generateDeck } from './deck.ts';
import type { GameState } from './state.ts';

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode);
  if (!board) return null;
  return {
    board,
    deck: generateDeck(board),
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}
