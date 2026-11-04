import { describe, expect, it } from 'vitest';
import { MAX_SEED, parseBoardCode, SUPPORTED_SIZES } from './boardCode.ts';

describe('version 1 board codes', () => {
  it('accepts every supported size and both seed boundaries', () => {
    for (const size of SUPPORTED_SIZES) {
      for (const seed of [1, MAX_SEED]) {
        expect(parseBoardCode(`np1-${size}-${seed}`)).toEqual({ code: `np1-${size}-${seed}`, size, seed });
      }
    }
  });

  it.each([
    '', 'np1-04-1', 'np1-4-01', 'np1-4-0', 'np1-4-2147483647',
    'np1-5-1', 'np2-4-1', 'NP1-4-1', 'np1-4-1.0', 'np1-4-+1',
    'np1-4-1e2', ' np1-4-1', 'np1-4-1 ', 'np1-4-1\n', 'np1-4-١',
    'np1-4-9007199254740992',
  ])('rejects nonexact code %j', code => {
    expect(parseBoardCode(code)).toBeNull();
  });
});
