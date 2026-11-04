import { describe, expect, it } from 'vitest';
import { parseBoardCode } from './deal.ts';

describe('board codes', () => {
  it('matches the independent version 1 example deck', () => {
    expect(parseBoardCode('np1-4-1')?.deck).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
  });

  it.each(['np1-5-1', 'np1-4-0', 'np1-4-01', 'np1-4-2147483647', 'np1-4-1x', 'NP1-4-1'])('rejects %s', (code) => {
    expect(parseBoardCode(code)).toBeNull();
  });

  it('contains exactly two copies of every face at each supported size', () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16]) {
      const board = parseBoardCode(`np1-${size}-2147483646`);
      expect(board?.deck).toHaveLength(size * size);
      expect(new Set(board?.deck).size).toBe(size * size / 2);
    }
  });
});
