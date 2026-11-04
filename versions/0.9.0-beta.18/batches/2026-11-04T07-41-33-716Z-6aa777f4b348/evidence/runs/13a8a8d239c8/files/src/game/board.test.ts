import { describe, expect, it } from 'vitest';
import { GRID_SIZES, isGridSize, parseBoardCode } from './board.ts';

describe('board codes', () => {
  it('repeats the documented version 1 deal', () => {
    const board = parseBoardCode('np1-4-1');
    expect(board?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    expect(Object.isFrozen(board?.deck)).toBe(true);
    expect(Object.isFrozen(board)).toBe(true);
  });

  it('matches an independent 4x4 vector for seed 7', () => {
    expect(parseBoardCode('np1-4-7')?.deck).toEqual([
      1, 2, 6, 5, 2, 1, 4, 5, 3, 3, 4, 7, 7, 0, 6, 0,
    ]);
  });

  it('matches an independent 6x6 vector for seed 1', () => {
    expect(parseBoardCode('np1-6-1')?.deck).toEqual([
      1, 9, 10, 14, 2, 17, 15, 11, 12, 5, 4, 6, 8, 17, 1, 12, 0, 7,
      10, 3, 16, 9, 3, 5, 13, 14, 4, 7, 13, 11, 16, 0, 8, 2, 6, 15,
    ]);
  });

  it('creates pairs for every supported grid size', () => {
    for (const size of GRID_SIZES) {
      const board = parseBoardCode(`np1-${size}-2147483646`);
      expect(board?.deck).toHaveLength(size * size);
      const counts = new Map<number, number>();
      for (const face of board?.deck ?? []) counts.set(face, (counts.get(face) ?? 0) + 1);
      expect([...counts.values()].every((count) => count === 2)).toBe(true);
    }
  });

  it('accepts only the exact code form and supported sizes', () => {
    for (const code of [
      'np1-4-0', 'np1-4-01', 'np1-5-1', 'np1-4-2147483647', 'np1-4-9007199254740992',
      ' np1-4-1', 'np1-4-1 ', 'np1-4-1\n', 'np1-4-1\r\n', 'NP1-4-1',
    ]) expect(parseBoardCode(code)).toBeNull();
    expect(isGridSize(4)).toBe(true);
    expect(isGridSize(5)).toBe(false);
  });
});
