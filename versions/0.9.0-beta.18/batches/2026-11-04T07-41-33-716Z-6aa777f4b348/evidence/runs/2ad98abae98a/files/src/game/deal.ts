import { isSize } from './model.ts';
import type { BoardDescription, GameState } from './model.ts';

export const MAX_SEED = 2147483646;
export function parseBoardCode(code: string): BoardDescription | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match || match[0] !== code) return null;
  const size = Number(match[1]);
  const seed = Number(match[2]);
  if (!isSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
  return Object.freeze({ code, size, seed });
}

export function generateDeck(board: BoardDescription): readonly number[] {
  let state = board.seed;
  const draw = (bound: number) => {
    const limit = Math.floor(MAX_SEED / bound) * bound;
    do { state = state * 16807 % 2147483647; } while (state - 1 >= limit);
    return (state - 1) % bound;
  };
  const deck = Array.from({ length: board.size ** 2 }, (_, index) => Math.floor(index / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = draw(i + 1);
    const first = deck[i];
    const second = deck[j];
    if (first === undefined || second === undefined) throw new Error('Invalid deck position');
    deck[i] = second;
    deck[j] = first;
  }
  return Object.freeze(deck);
}

export function createGame(code: string): GameState | null {
  const board = parseBoardCode(code);
  return board ? {
    board, deck: generateDeck(board), matched: [], selection: { kind: 'closed' },
    moves: 0, elapsedMs: 0, started: false,
  } : null;
}
