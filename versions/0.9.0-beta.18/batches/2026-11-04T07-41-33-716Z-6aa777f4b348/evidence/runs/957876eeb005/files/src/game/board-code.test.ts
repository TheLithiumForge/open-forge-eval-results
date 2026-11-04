import { describe, expect, it } from 'vitest';
import { parseBoardCode, SUPPORTED_SIZES } from './board-code.ts';

it('accepts every supported size and the seed endpoints', () => {
  for (const size of SUPPORTED_SIZES) {
    expect(parseBoardCode(`np1-${size}-1`)).toEqual({ code: `np1-${size}-1`, size, seed: 1 });
    expect(parseBoardCode(`np1-${size}-2147483646`)?.seed).toBe(2147483646);
  }
});

describe('exact board grammar', () => {
  for (const code of [
    '', 'np2-4-1', 'np1-2-1', 'np1-5-1', 'np1-04-1', 'np1-4-01', 'np1-4-0',
    'np1-4-2147483647', 'np1-4-9007199254740993', 'np1-4--1', 'np1-4-+1',
    'np1-4-1.0', 'np1-4-1e3', 'NP1-4-1', ' np1-4-1', 'np1-4-1 ',
    'np1-4-1\n', 'np1-4-1\r', 'np1-4-1\r\n', 'np1-4-١',
  ]) it(`rejects ${JSON.stringify(code)}`, () => expect(parseBoardCode(code)).toBeNull());
});
