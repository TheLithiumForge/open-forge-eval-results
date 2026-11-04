import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPreferences, savePreferences, STORAGE_KEY } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());

describe('optional saved preferences', () => {
  it('reads supported size and independently validates bounded integer scores', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ size: 16, bests: { 4: 8, 6: -1, 8: 3.5, 10: 1000000, 12: 999999, 14: null, 16: '128' } }),
    });
    expect(readPreferences()).toEqual({ size: 16, bests: { 4: 8, 12: 999999 } });
  });
  it.each([null, '', '{', 'null', '[]', '42', '{"size":5}', '{"size":"4"}', '{"bests":[8]}'])
    ('ignores malformed or unsupported preferences %s', (text) => {
      vi.stubGlobal('localStorage', { getItem: () => text });
      expect(readPreferences()).toEqual({ size: 4, bests: {} });
    });
  it('catches a denied storage read', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied'); } });
    expect(readPreferences()).toEqual({ size: 4, bests: {} });
  });
  it('catches a failed write without clearing any other key', () => {
    const setItem = vi.fn(() => { throw new Error('Quota'); });
    vi.stubGlobal('localStorage', { setItem });
    expect(() => savePreferences({ size: 6, bests: { 6: 18 } })).not.toThrow();
    expect(setItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, '{"size":6,"bests":{"6":18}}');
  });
});
