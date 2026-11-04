import { describe, expect, it } from 'vitest';
import { GRID_SIZES, parseBoardCode } from './boardCode.ts';
import { generateBoard } from './deck.ts';
import { boundedRandom, nextRandomState } from './random.ts';

describe('version 1 deals', () => {
  it('matches the specified Park-Miller states and rejection draw', () => {
    let state = 1;
    const actual = Array.from({ length: 5 }, () => { state = nextRandomState(state); return state; });
    expect(actual).toEqual([16807, 282475249, 1622650073, 984943658, 1144108930]);
    // First state is q and is rejected for a 16-result draw.
    expect(boundedRandom(739806647, 16)).toEqual({ state: 2147466840, value: 7 });
  });

  it('matches literal deck vectors, independently calculated with BigInt', () => {
    const first = parseBoardCode('np1-4-1');
    const second = parseBoardCode('np1-6-2147483646');
    if (first === null || second === null) throw new Error('Invalid vector code.');
    expect(generateBoard(first).deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(generateBoard(second).deck).toEqual([
      17, 2, 10, 5, 15, 4, 12, 10, 0, 17, 5, 15, 2, 6, 8, 7, 12, 1,
      0, 11, 16, 1, 16, 9, 3, 14, 13, 13, 4, 6, 7, 14, 8, 9, 3, 11,
    ]);
  });

  it.each(GRID_SIZES)('deals exactly two of every face at size %i', (size) => {
    const description = parseBoardCode(`np1-${size}-42`);
    if (description === null) throw new Error('Invalid size.');
    const board = generateBoard(description);
    expect(board.deck).toHaveLength(size * size);
    expect(new Set(board.deck).size).toBe(size * size / 2);
    for (let face = 0; face < size * size / 2; face += 1) {
      expect(board.deck.filter((value) => value === face)).toHaveLength(2);
    }
    expect(Object.isFrozen(board)).toBe(true);
    expect(Object.isFrozen(board.deck)).toBe(true);
    expect(generateBoard(description).deck).toEqual(board.deck);
  });

  it.each(['np1-4-0', 'np1-4-01', 'np1-04-1', 'np1-5-1', 'np2-4-1',
    'NP1-4-1', 'np1-4-2147483647', 'np1-4-1.0', 'np1-4-+1', 'np1-4-1e1',
    ' np1-4-1', 'np1-4-1 ', 'np1-4-1\n', 'np1-4-9007199254740993'])('rejects %j', (code) => {
    expect(parseBoardCode(code)).toBeNull();
  });
});
