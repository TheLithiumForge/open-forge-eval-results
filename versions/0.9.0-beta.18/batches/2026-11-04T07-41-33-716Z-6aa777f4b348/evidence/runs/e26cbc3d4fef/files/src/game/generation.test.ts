import { describe, expect, it } from 'vitest';
import { parseBoardCode, supportedSizes } from './boardCode.ts';
import { createGame } from './game.ts';
import { drawBounded, nextGeneratorState } from './generation.ts';

describe('version 1 board generation', () => {
  it('matches the specification generator and complete deck vectors', () => {
    let state = 1;
    const actual: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      state = nextGeneratorState(state);
      actual.push(state);
    }
    expect(actual).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
    expect(createGame('np1-4-1').deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it('matches additional literal vectors independently computed with Python integer arithmetic', () => {
    expect(createGame('np1-4-2147483646').deck).toEqual([
      6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3,
    ]);
    expect(createGame('np1-6-12345').deck).toEqual([
      17, 2, 2, 16, 17, 8, 1, 10, 13, 4, 0, 6, 0, 8, 4, 12, 7, 11,
      10, 14, 9, 13, 3, 6, 5, 3, 11, 16, 12, 15, 9, 1, 15, 5, 14, 7,
    ]);
  });

  it('rejects biased generator results before taking a bounded result', () => {
    expect(drawBounded(739806647, 256)).toEqual([2147466840, 87]);
  });

  it.each(supportedSizes)('creates exactly two of every face for size %i', (size) => {
    const state = createGame(`np1-${size}-1`);
    expect(state.deck).toHaveLength(size * size);
    for (let face = 0; face < size * size / 2; face += 1) {
      expect(state.deck.filter((value) => value === face)).toHaveLength(2);
    }
    expect(Object.isFrozen(state.deck)).toBe(true);
    expect(Object.isFrozen(state.board)).toBe(true);
    expect(createGame(state.board.code).deck).toEqual(state.deck);
  });
});

describe('strict board-code parsing', () => {
  it.each(['np1-4-1', 'np1-16-2147483646'])('accepts %s', (code) => {
    expect(parseBoardCode(code)?.code).toBe(code);
  });
  it.each([
    '', 'np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647', 'np1-4--1',
    'np1-4-1.0', 'np1-4-1e1', 'np1-5-1', 'np2-4-1', 'NP1-4-1', ' np1-4-1',
    'np1-4-1 ', 'np1-4-1\n', 'np1-4-9999999999999999999999', 'np1-4-+1',
  ])('rejects %j without trimming', (code) => {
    expect(parseBoardCode(code)).toBeNull();
    expect(() => createGame(code)).toThrow('Invalid board code.');
  });
});
