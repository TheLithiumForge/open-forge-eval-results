import { parseBoardCode } from './board/boardCode.ts';
import { generateDeck } from './board/generateDeck.ts';
import { CLOSED_SELECTION, type GameState } from './types.ts';

export function createGame(boardCode: string): GameState | null {
  const parsed = parseBoardCode(boardCode);
  if (!parsed) return null;
  const deck = generateDeck(parsed.code);
  if (!deck) return null;
  return Object.freeze({
    board: Object.freeze({ boardCode: parsed.code, size: parsed.size, deck }),
    matched: Object.freeze([]),
    selection: CLOSED_SELECTION,
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
}
