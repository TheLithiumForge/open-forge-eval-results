import { describe, expect, it } from 'vitest';
import { GRID_SIZES, parseBoardCode } from './boardCode.ts';
import { nextGeneratorState } from './deck.ts';
import { createGame } from './state.ts';

describe('version 1 board codes and generation', () => {
  it('matches independently stated Park-Miller states', () => {
    let state = 1;
    const actual = Array.from({ length: 5 }, () => {
      state = nextGeneratorState(state);
      return state;
    });
    expect(actual).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });

  it('matches literal shuffled decks at both seed boundaries', () => {
    expect(createGame('np1-4-1').board.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(createGame('np1-4-2147483646').board.deck)
      .toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]);
  });

  it.each(GRID_SIZES)('deals two copies of every face for %i columns', (size) => {
    const { board } = createGame(`np1-${size}-123456`);
    expect(board.deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face += 1) {
      expect(board.deck.filter((value) => value === face)).toHaveLength(2);
    }
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board.deck)).toBe(true);
  });

  it.each([
    '', 'np2-4-1', 'NP1-4-1', 'np1-04-1', 'np1-4-01', 'np1-4-0',
    'np1-4-2147483647', 'np1-5-1', 'np1-4-1.0', 'np1-4-1e1',
    ' np1-4-1', 'np1-4-1 ', 'np1-4-1\n', 'np1-4-1\r\n',
  ])('rejects noncanonical code %j', (code) => {
    expect(parseBoardCode(code)).toBeNull();
    expect(() => createGame(code)).toThrow('Invalid board code.');
  });
});
