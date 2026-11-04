import { describe, expect, it } from 'vitest';
import { PREFERENCES_KEY, readPreferences, recordBest, writePreferences } from './storage.ts';
import type { PreferenceStorage } from './storage.ts';

function storage(text: string | null): PreferenceStorage {
  return { getItem: () => text, setItem: () => undefined };
}
const saved = (value: unknown) => () => storage(JSON.stringify(value));

describe('saved preferences', () => {
  it('loads supported size and validated move records', () => {
    expect(readPreferences(saved({ version: 1, size: 16, bests: { 4: 8, 16: 999999 } })))
      .toEqual({ size: 16, bests: { 4: 8, 16: 999999 } });
  });

  it.each([null, [], true, {}, { version: 2, size: 6 }, { version: 1, size: '6' },
    { version: 1, size: 5 }, { version: 1, size: null }])('ignores invalid size input %j', (value) => {
    expect(readPreferences(saved(value)).size).toBe(4);
  });

  it('keeps only finite nonnegative safe integer scores within the move cap', () => {
    const preferences = readPreferences(saved({ version: 1, size: 6,
      bests: { 4: -1, 6: 10.5, 8: '32', 10: 1000000, 12: null, 14: 0, 16: 128, 3: 4 } }));
    expect(preferences).toEqual({ size: 6, bests: { 14: 0, 16: 128 } });
    expect(readPreferences(() => storage('{"version":1,"bests":{"4":1e999}}')).bests).toEqual({});
  });

  it('catches blocked access, read errors and malformed saved JSON', () => {
    expect(readPreferences(() => { throw new Error('Blocked localStorage getter'); }))
      .toEqual({ size: 4, bests: {} });
    expect(readPreferences(() => ({ getItem: () => { throw new Error('Blocked read'); },
      setItem: () => undefined }))).toEqual({ size: 4, bests: {} });
    expect(readPreferences(() => storage('{'))).toEqual({ size: 4, bests: {} });
    expect(readPreferences(() => null)).toEqual({ size: 4, bests: {} });
  });

  it('writes only its own key and tolerates storage failure', () => {
    const values = new Map([['unrelated', 'keep']]);
    const port: PreferenceStorage = { getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); } };
    const preferences = { size: 4, bests: { 4: 8 } } as const;
    writePreferences(preferences, () => port);
    expect(values.get('unrelated')).toBe('keep');
    expect(JSON.parse(values.get(PREFERENCES_KEY) ?? 'null')).toEqual({ version: 1, ...preferences });
    expect(() => writePreferences(preferences, () => { throw new Error('Blocked getter'); })).not.toThrow();
    expect(() => writePreferences(preferences, () => ({ getItem: () => null,
      setItem: () => { throw new Error('Quota exceeded'); } }))).not.toThrow();
    expect(preferences.bests[4]).toBe(8);
  });

  it('records only better results and keeps other sizes', () => {
    const original = { size: 6, bests: { 4: 9, 6: 20 } } as const;
    expect(recordBest(original, 4, 9)).toBe(original);
    expect(recordBest(original, 4, 10)).toBe(original);
    expect(recordBest(original, 4, 8)).toEqual({ size: 6, bests: { 4: 8, 6: 20 } });
    expect(recordBest(original, 8, 32).bests[8]).toBe(32);
    expect(original.bests[4]).toBe(9);
  });
});
