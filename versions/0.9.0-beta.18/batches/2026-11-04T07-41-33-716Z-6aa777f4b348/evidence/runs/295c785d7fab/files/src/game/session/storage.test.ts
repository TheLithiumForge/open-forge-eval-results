import { describe, expect, it } from 'vitest';
import { parsePreferences, PREFERENCES_KEY, readPreferences, savePreferences } from './storage.ts';
import type { PreferenceStorage } from './storage.ts';

describe('saved preferences and storage failures', () => {
  it('accepts supported sizes and bounded integer bests, ignoring invalid values', () => {
    expect(parsePreferences(JSON.stringify({ size: 16, best: { 4: 8, 6: 999999, 8: 1000000,
      10: -1, 12: 2.5, 14: '3', 16: null, 5: 10 } }))).toEqual({ size: 16, best: { 4: 8, 6: 999999 } });
    for (const text of [null, '{', 'null', '[]', '4', '{"size":5}', '{"size":"6"}']) {
      expect(parsePreferences(text)).toEqual({ size: 4, best: {} });
    }
  });
  it('catches unavailable reads and writes and only writes the owned key', () => {
    const broken: PreferenceStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
    expect(readPreferences(broken)).toEqual({ size: 4, best: {} });
    expect(() => savePreferences(broken, { size: 4, best: {} })).not.toThrow();
    expect(readPreferences(null)).toEqual({ size: 4, best: {} });
    const values = new Map([['unrelated', 'keep me']]);
    const storage: PreferenceStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
    savePreferences(storage, { size: 8, best: { 8: 32 } });
    expect(values.get('unrelated')).toBe('keep me');
    expect(values.size).toBe(2);
    expect(values.has(PREFERENCES_KEY)).toBe(true);
    expect(readPreferences(storage)).toEqual({ size: 8, best: { 8: 32 } });
  });
});
