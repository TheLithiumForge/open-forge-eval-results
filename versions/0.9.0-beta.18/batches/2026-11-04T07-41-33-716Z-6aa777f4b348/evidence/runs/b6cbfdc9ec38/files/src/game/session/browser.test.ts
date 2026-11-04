import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_SEED } from '../boardCode.ts';
import { freshSeed } from './browser.ts';

afterEach(() => { vi.unstubAllGlobals(); });

describe('fresh browser seeds', () => {
  it('avoids repeating the current seed even when the random draw collides', () => {
    vi.stubGlobal('crypto', { getRandomValues(words: Uint32Array): Uint32Array { words[0] = 6; return words; } });
    expect(freshSeed()).toBe(7);
    expect(freshSeed(7)).toBe(8);
    vi.stubGlobal('crypto', { getRandomValues(words: Uint32Array): Uint32Array { words[0] = MAX_SEED - 1; return words; } });
    expect(freshSeed(MAX_SEED)).toBe(1);
  });

  it('falls back to an available source if crypto fails', () => {
    vi.stubGlobal('crypto', { getRandomValues(): never { throw new Error('unavailable'); } });
    const seed = freshSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(1);
    expect(seed).toBeLessThanOrEqual(MAX_SEED);
  });
});
