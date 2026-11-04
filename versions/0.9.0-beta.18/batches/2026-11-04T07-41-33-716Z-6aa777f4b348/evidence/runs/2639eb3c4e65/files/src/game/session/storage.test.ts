import { afterEach, expect, it, vi } from 'vitest';
import { PREFERENCES_KEY, readPreferences, savePreferences } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());

it('validates sizes and each bounded integer best score', () => {
  const getItem = vi.fn(() => JSON.stringify({ size: 16, best: { 4: 8, 6: 999999, 8: 1000000, 10: -1, 12: 2.5, 14: '2', 16: null } }));
  vi.stubGlobal('localStorage', { getItem });
  expect(readPreferences()).toEqual({ size: 16, best: { 4: 8, 6: 999999 } });
  expect(getItem).toHaveBeenCalledWith(PREFERENCES_KEY);
});
it.each(['{', 'null', '[]', '{"size":5}', '{"size":"4"}'])('ignores invalid preferences %s', text => {
  vi.stubGlobal('localStorage', { getItem: () => text });
  expect(readPreferences()).toEqual({ size: 4, best: {} });
});
it('catches read and write failures and never clears unrelated keys', () => {
  const storage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  vi.stubGlobal('localStorage', storage);
  expect(readPreferences()).toEqual({ size: 4, best: {} });
  expect(() => savePreferences({ size: 4, best: {} })).not.toThrow();
});
