import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREFERENCES_KEY, readPreferences, recordBest, savePreferences } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());

describe('optional saved preferences', () => {
  it('validates sizes and each finite integer score independently', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ size: 6, bests: {
      4: 8, 6: 999999, 8: 1000000, 10: -1, 12: 1.5, 14: '8', 16: null,
    } }) });
    expect(readPreferences()).toEqual({ size: 6, bests: { 4: 8, 6: 999999 } });
  });

  it.each(['null', '[]', '{', '{"size":5,"bests":[]}', '{"size":"6"}'])('ignores invalid preferences %s', (saved) => {
    vi.stubGlobal('localStorage', { getItem: () => saved });
    expect(readPreferences()).toEqual({ size: 4, bests: {} });
  });

  it('keeps only its own key and never stores active progress', () => {
    const data = new Map([['unrelated', 'keep']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    expect(readPreferences()).toEqual({ size: 4, bests: {} });
    savePreferences({ size: 8, bests: { 4: 10 } });
    expect(data.size).toBe(2);
    expect(data.get('unrelated')).toBe('keep');
    expect(data.get(PREFERENCES_KEY)).toBe('{"size":8,"bests":{"4":10}}');
  });

  it('tolerates read and write failures', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('full'); },
    });
    expect(readPreferences()).toEqual({ size: 4, bests: {} });
    expect(() => savePreferences({ size: 4, bests: {} })).not.toThrow();
  });

  it('records only a better result for that size', () => {
    const preferences = { size: 4, bests: { 4: 12 } } as const;
    expect(recordBest(preferences, 4, 12)).toBe(preferences);
    expect(recordBest(preferences, 4, 13)).toBe(preferences);
    expect(recordBest(preferences, 4, 10)).toEqual({ size: 4, bests: { 4: 10 } });
    expect(recordBest(preferences, 6, 18)).toEqual({ size: 4, bests: { 4: 12, 6: 18 } });
  });
});
