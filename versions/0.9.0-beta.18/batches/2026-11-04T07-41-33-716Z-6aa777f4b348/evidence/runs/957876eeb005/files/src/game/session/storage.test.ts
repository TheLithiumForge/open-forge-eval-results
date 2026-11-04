import { expect, it } from 'vitest';
import {
  decodePreferences, defaultPreferences, PREFERENCES_KEY, readPreferences, rememberBest, writePreferences,
} from './storage.ts';
import type { PreferenceStorage } from './storage.ts';

it('defaults unavailable, malformed and nonobject preferences safely', () => {
  for (const text of ['{', 'null', '[]', 'true', '42', '"value"']) {
    expect(decodePreferences(text)).toEqual(defaultPreferences());
  }
  expect(readPreferences({ getItem: () => null, setItem: () => undefined })).toEqual(defaultPreferences());
  expect(readPreferences({ getItem: () => { throw new Error('denied'); }, setItem: () => undefined }))
    .toEqual(defaultPreferences());
  expect(readPreferences()).toEqual(defaultPreferences());
});

it('validates sizes and scores separately and keeps supported finite integer records', () => {
  expect(decodePreferences('{"size":16,"bests":{"4":8,"16":128,"6":999999}}'))
    .toEqual({ size: 16, bests: { 4: 8, 6: 999999, 16: 128 } });
  for (const invalid of [0, 2, 5, 18, '4', null, [], {}, 4.5]) {
    expect(decodePreferences(JSON.stringify({ size: invalid, bests: { 4: 9 } })))
      .toEqual({ size: 4, bests: { 4: 9 } });
  }
  for (const invalid of [-1, 1.5, 1000000, Number.MAX_SAFE_INTEGER, '8', null, true, [], {}]) {
    expect(decodePreferences(JSON.stringify({ size: 6, bests: { 4: invalid, 6: 18, 5: 7 } })))
      .toEqual({ size: 6, bests: { 6: 18 } });
  }
  expect(decodePreferences('{"size":4,"bests":{"4":1e400}}').bests).toEqual({});
});

it('reads and writes only its own storage key and tolerates write failures', () => {
  const data = new Map([['other-app', 'keep me']]);
  const storage: PreferenceStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
  };
  const preferences = { size: 6, bests: { 4: 8 } } as const;
  writePreferences(preferences, storage);
  expect(data.get('other-app')).toBe('keep me');
  expect(data.size).toBe(2);
  expect(data.has(PREFERENCES_KEY)).toBe(true);
  expect(readPreferences(storage)).toEqual(preferences);
  expect(() => writePreferences(preferences, {
    getItem: () => null, setItem: () => { throw new Error('quota'); },
  })).not.toThrow();
  expect(() => writePreferences(preferences)).not.toThrow();
});

it('keeps only an improved capped integer score and preserves other sizes', () => {
  const initial = { size: 4, bests: { 4: 10, 6: 25 } } as const;
  const improved = rememberBest(initial, 4, 9);
  expect(improved).toEqual({ size: 4, bests: { 4: 9, 6: 25 } });
  expect(rememberBest(improved, 4, 9)).toBe(improved);
  expect(rememberBest(improved, 4, 12)).toBe(improved);
  for (const invalid of [-1, 8.5, 1000000, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(rememberBest(initial, 4, invalid)).toBe(initial);
  }
  expect(rememberBest(initial, 16, 999999).bests[16]).toBe(999999);
});
