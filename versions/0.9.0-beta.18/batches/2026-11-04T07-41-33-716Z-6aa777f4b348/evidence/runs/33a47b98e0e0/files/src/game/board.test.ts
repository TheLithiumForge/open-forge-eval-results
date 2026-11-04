import { describe, expect, it } from 'vitest';
import { BOARD_SIZES, generateDeck, parseBoardCode } from './board.ts';
import { createGame } from './state.ts';

describe('board codes and deals', () => {
  it('reproduces the literal version 1 seed vector', () => {
    const game = createGame('np1-4-1');
    expect(game?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it('accepts only supported sizes and canonical bounded decimal seeds', () => {
    expect(parseBoardCode('np1-16-2147483646')?.seed).toBe(2_147_483_646);
    for (const code of ['np1-4-0', 'np1-04-1', 'np1-5-1', 'np1-4-01', 'np1-4-2147483647', 'NP1-4-1', ' np1-4-1', 'np1-4-1 ', 'np1-4-1\n']) {
      expect(parseBoardCode(code), code).toBeNull();
    }
  });

  it('creates exactly two of every face at each supported size', () => {
    for (const size of BOARD_SIZES) {
      const board = parseBoardCode(`np1-${size}-77`);
      expect(board).not.toBeNull();
      if (board === null) continue;
      const deck = generateDeck(board);
      expect(deck).toHaveLength(size * size);
      for (let face = 0; face < deck.length / 2; face += 1) {
        expect(deck.filter((value) => value === face)).toHaveLength(2);
      }
    }
  });
});
