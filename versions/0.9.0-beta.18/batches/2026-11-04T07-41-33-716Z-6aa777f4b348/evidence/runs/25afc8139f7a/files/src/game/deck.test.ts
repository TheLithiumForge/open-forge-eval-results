import { describe, expect, it } from 'vitest';
import { BOARD_SIZES, parseBoardCode } from './boardCode.ts';
import { boundedDraw, nextParkMiller } from './deck.ts';
import { testGame } from './state.test-support.ts';

describe('version 1 deterministic generation', () => {
  it('matches the stated Park-Miller states', () => {
    let state = 1;
    const states: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      state = nextParkMiller(state);
      states.push(state);
    }
    expect(states).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
  });

  it.each([
    ['np1-4-1', [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]],
    ['np1-4-2', [2, 0, 1, 4, 7, 4, 5, 6, 5, 7, 2, 0, 3, 1, 3, 6]],
    ['np1-4-2147483646', [6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3]],
    ['np1-6-2147483646', [17, 2, 10, 5, 15, 4, 12, 10, 0, 17, 5, 15,
      2, 6, 8, 7, 12, 1, 0, 11, 16, 1, 16, 9, 3, 14, 13, 13, 4, 6, 7, 14, 8, 9, 3, 11]],
  ] satisfies [string, number[]][])('matches independent literal deck %s', (code, deck) => {
    expect(testGame(code).board.deck).toEqual(deck);
  });

  it('rejects a biased random result and advances again', () => {
    expect(boundedDraw(739806647, 256)).toEqual({ state: 2147466840, value: 87 });
  });

  it.each(BOARD_SIZES)('creates exactly two of every face on size %i', (size) => {
    const { board } = testGame(`np1-${size}-73`);
    expect(board.deck).toHaveLength(size * size);
    const sorted = [...board.deck].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: size * size }, (_, index) => Math.floor(index / 2)));
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board.deck)).toBe(true);
  });
});

describe('canonical board code validation', () => {
  it.each(['np1-4-0', 'np1-4-01', 'np1-04-1', 'np1-5-1', 'np2-4-1', 'np1-4--1',
    'np1-4-2147483647', 'np1-4-1.0', 'np1-4-1e2', ' np1-4-1', 'np1-4-1\n',
    'np1-4-1 ', 'np1-4-9007199254740993000000', '', 'np1-4-+1'])('rejects %j', (code) => {
    expect(parseBoardCode(code)).toBeNull();
  });
  it('accepts both seed limits and the complete supported size set', () => {
    for (const size of BOARD_SIZES) {
      for (const seed of [1, 2147483646]) {
        expect(parseBoardCode(`np1-${size}-${seed}`)).toEqual({ code: `np1-${size}-${seed}`, size, seed });
      }
    }
  });
});
