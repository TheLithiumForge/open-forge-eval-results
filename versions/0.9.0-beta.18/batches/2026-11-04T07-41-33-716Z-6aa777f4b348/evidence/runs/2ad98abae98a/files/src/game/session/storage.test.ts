import { afterEach, expect, it, vi } from 'vitest';
import { readPreferences, savePreferences, STORAGE_KEY } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());
it('ignores corrupt preferences and invalid scores independently', () => {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ size: 16, bests: { 4: 12, 6: -1, 8: 1.5, 10: 1000000, 12: '42' } }) });
  expect(readPreferences()).toEqual({ size: 16, bests: { 4: 12 } });
  vi.stubGlobal('localStorage', { getItem: () => '{' });
  expect(readPreferences()).toEqual({ size: 4, bests: {} });
});
it('handles unavailable storage without interrupting play', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => { throw new Error('Blocked'); },
    setItem: () => { throw new Error('Blocked'); },
  });
  expect(readPreferences()).toEqual({ size: 4, bests: {} });
  expect(() => savePreferences({ size: 4, bests: {} })).not.toThrow();
});
it('writes only its own preference key', () => {
  const setItem = vi.fn();
  vi.stubGlobal('localStorage', { setItem });
  savePreferences({ size: 6, bests: { 6: 18 } });
  expect(setItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, JSON.stringify({ size: 6, bests: { 6: 18 } }));
});
