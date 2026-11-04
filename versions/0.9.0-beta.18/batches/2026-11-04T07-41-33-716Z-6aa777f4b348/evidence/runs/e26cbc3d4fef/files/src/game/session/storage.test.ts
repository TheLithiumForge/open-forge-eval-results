import { describe, expect, it } from 'vitest';
import { MAX_MOVES } from '../game.ts';
import { decodePreferences, PREFERENCES_KEY, readPreferences, recordBest, savePreferences } from './storage.ts';
import type { PreferenceStorage } from './storage.ts';

function stored(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ version: 1, size: 6, bests: { 4: 10, 6: 25 }, ...overrides });
}

describe('saved preferences', () => {
  it('validates a supported size and finite integer best scores through the move cap', () => {
    expect(decodePreferences(stored())).toEqual({ size: 6, bests: { 4: 10, 6: 25 } });
    expect(decodePreferences(stored({ bests: { 4: 0, 16: MAX_MOVES } })))
      .toEqual({ size: 6, bests: { 4: 0, 16: MAX_MOVES } });
  });

  it.each([
    { version: 2 }, { size: '6' }, { size: 5 }, { bests: [] }, { bests: null },
    { bests: { 5: 10 } }, { bests: { '04': 10 } }, { bests: { 4: '10' } },
    { bests: { 4: -1 } }, { bests: { 4: 0.5 } }, { bests: { 4: MAX_MOVES + 1 } },
    { bests: { 4: null } }, { extra: true },
  ])('ignores invalid preferences %j', (overrides) => {
    expect(decodePreferences(stored(overrides))).toBeNull();
    const storage = { getItem: () => stored(overrides), setItem: () => {} };
    expect(readPreferences(storage)).toEqual({ size: 4, bests: {} });
  });

  it('catches missing storage, read/parse failures and write failures', () => {
    const broken: PreferenceStorage = {
      getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); },
    };
    expect(readPreferences(null)).toEqual({ size: 4, bests: {} });
    expect(readPreferences(broken)).toEqual({ size: 4, bests: {} });
    expect(readPreferences({ ...broken, getItem: () => '{' })).toEqual({ size: 4, bests: {} });
    expect(() => savePreferences({ size: 4, bests: {} }, broken)).not.toThrow();
    expect(() => savePreferences({ size: 4, bests: {} }, null)).not.toThrow();
  });

  it('only reads and writes its own key, and never saves active progress', () => {
    const items = new Map([['unrelated', 'keep me'], [PREFERENCES_KEY, stored()]]);
    const storage: PreferenceStorage = {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => { items.set(key, value); },
    };
    expect(readPreferences(storage).size).toBe(6);
    savePreferences({ size: 16, bests: { 4: 8 } }, storage);
    expect(items.get('unrelated')).toBe('keep me');
    expect(items.size).toBe(2);
    expect(items.get(PREFERENCES_KEY)).toBe('{"version":1,"size":16,"bests":{"4":8}}');
  });

  it('retains equal/worse records and updates only the completed size on improvement', () => {
    const preferences = { size: 4, bests: { 4: 10, 6: 20 } } as const;
    expect(recordBest(preferences, 4, 10)).toBe(preferences);
    expect(recordBest(preferences, 4, 11)).toBe(preferences);
    expect(recordBest(preferences, 4, 8)).toEqual({ size: 4, bests: { 4: 8, 6: 20 } });
    expect(recordBest(preferences, 8, 32)).toEqual({ size: 4, bests: { 4: 10, 6: 20, 8: 32 } });
  });
});
