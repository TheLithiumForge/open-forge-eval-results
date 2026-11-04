import { afterEach, expect, it, vi } from 'vitest';
import { PREFERENCES_KEY, readPreferences, writePreferences } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());

it('validates untrusted preferences and score caps', () => {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ size: 6, bests: { 4: 8, 6: 999999, 8: -1, 10: 1.5, 12: 1000000, 14: '10' } }) });
  expect(readPreferences()).toEqual({ size: 6, bests: { 4: 8, 6: 999999 } });
});

it('ignores bad JSON, missing storage and invalid sizes', () => {
  vi.stubGlobal('localStorage', { getItem: () => '{' });
  expect(readPreferences()).toEqual({ size: 4, bests: {} });
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ size: 5 }) });
  expect(readPreferences().size).toBe(4);
  vi.stubGlobal('localStorage', undefined);
  expect(readPreferences().size).toBe(4);
  expect(() => writePreferences({ size: 4, bests: {} })).not.toThrow();
});

it('writes only the game key and catches storage exceptions', () => {
  const setItem = vi.fn();
  vi.stubGlobal('localStorage', { setItem });
  writePreferences({ size: 8, bests: { 4: 8 } });
  expect(setItem).toHaveBeenCalledExactlyOnceWith(PREFERENCES_KEY, JSON.stringify({ size: 8, bests: { 4: 8 } }));
  vi.stubGlobal('localStorage', { setItem: () => { throw new Error('denied'); } });
  expect(() => writePreferences({ size: 4, bests: {} })).not.toThrow();
});
