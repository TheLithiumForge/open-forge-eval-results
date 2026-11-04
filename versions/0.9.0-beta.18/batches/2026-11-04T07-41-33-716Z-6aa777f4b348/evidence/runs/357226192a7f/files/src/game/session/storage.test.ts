import { afterEach, expect, it, vi } from 'vitest';
import { PREFERENCES_KEY, readPreferences, savePreferences } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());

it('validates saved sizes and finite integer capped scores', () => {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ size: 16,
    bests: { 4: 8, 6: -1, 8: 1.5, 10: '50', 12: 1000000, 14: 999999, 16: null } }) });
  expect(readPreferences()).toEqual({ size: 16, bests: { 4: 8, 14: 999999 } });
});

it('survives missing, malformed and unavailable storage', () => {
  for (const value of [null, 'null', '[4]', '{', '{"size":5}', '{"size":"4"}']) {
    vi.stubGlobal('localStorage', { getItem: () => value });
    expect(readPreferences()).toEqual({ size: 4, bests: {} });
  }
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked'); },
    setItem: () => { throw new Error('Full'); } });
  expect(readPreferences()).toEqual({ size: 4, bests: {} });
  expect(() => savePreferences({ size: 4, bests: {} })).not.toThrow();
});

it('writes only its own preference key', () => {
  const setItem = vi.fn();
  vi.stubGlobal('localStorage', { setItem });
  savePreferences({ size: 6, bests: { 4: 8 } });
  expect(setItem).toHaveBeenCalledExactlyOnceWith(PREFERENCES_KEY, '{"size":6,"bests":{"4":8}}');
});
