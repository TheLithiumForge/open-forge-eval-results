import { afterEach, describe, expect, it, vi } from 'vitest';
import { freshGame } from './freshGame.ts';

afterEach(() => vi.unstubAllGlobals());

function randomValue(value: number) {
  vi.stubGlobal('crypto', { getRandomValues: (array: Uint32Array) => { array[0] = value; return array; } });
}

describe('fresh browser deals', () => {
  it('uses a supported size and a valid nonzero seed', () => {
    randomValue(0);
    expect(freshGame(6).board.code).toBe('np1-6-1');
  });

  it('changes the seed even when the random draw repeats the previous seed', () => {
    randomValue(0);
    expect(freshGame(4, 1).board.seed).toBe(2);
  });

  it('wraps a repeated maximum seed into the valid range', () => {
    randomValue(2147483645);
    expect(freshGame(16, 2147483646).board.code).toBe('np1-16-1');
  });

  it('accepts the full unsigned random range', () => {
    randomValue(4294967295);
    const state = freshGame(4);
    expect(state.board.seed).toBe(4);
    expect(state.started).toBe(false);
    expect(state.selection).toEqual({ kind: 'closed' });
  });
});
