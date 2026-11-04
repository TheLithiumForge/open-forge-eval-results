import { expect, it } from 'vitest';
import { PREFERENCES_KEY, readPreferences, savePreferences } from './storage.ts';
import type { PreferenceStorage } from './storage.ts';

it('validates saved sizes and integer capped best scores as unknown input', () => {
  const storage = { getItem: () => JSON.stringify({ version: 1, size: 16,
    bests: { 4: 8, 6: -1, 8: 3.5, 10: 1000000, 12: '5', 14: 999999, 16: 128 } }), setItem: () => {} };
  expect(readPreferences(storage)).toEqual({ size: 16, bests: { 4: 8, 14: 999999, 16: 128 } });
  expect(readPreferences({ ...storage, getItem: () => '{' })).toEqual({ size: 4, bests: {} });
  expect(readPreferences({ ...storage, getItem: () => '{"version":1,"size":5}' })).toEqual({ size: 4, bests: {} });
});
it('catches unavailable storage and writes only its own key', () => {
  const unavailable: PreferenceStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  expect(readPreferences(unavailable)).toEqual({ size: 4, bests: {} });
  expect(() => savePreferences(unavailable, { size: 4, bests: {} })).not.toThrow();
  const keys: string[] = [];
  savePreferences({ getItem: () => null, setItem: (key) => { keys.push(key); } }, { size: 6, bests: { 6: 18 } });
  expect(keys).toEqual([PREFERENCES_KEY]);
});
