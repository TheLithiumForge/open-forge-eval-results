import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREFERENCES_KEY, readPreferences, recordBest, writePreferences } from './storage.ts';
import { MAX_MOVES } from '../transitions.ts';

afterEach(() => { vi.unstubAllGlobals(); });

describe('optional saved preferences', () => {
  it('validates supported sizes and capped integer bests without trusting saved JSON', () => {
    const getItem = vi.fn(() => JSON.stringify({ size: 16, best: {
      4: 8, 6: -1, 8: 3.5, 10: MAX_MOVES + 1, 12: MAX_MOVES, 14: '98', 16: null, 5: 10,
    } }));
    vi.stubGlobal('localStorage', { getItem });
    expect(readPreferences()).toEqual({ size: 16, best: { 4: 8, 12: MAX_MOVES } });
    expect(getItem).toHaveBeenCalledWith(PREFERENCES_KEY);
  });

  it.each(['{', 'null', '[]', 'true', '{"size":5}', '{"size":"16"}'])('ignores invalid saved input %s', (text) => {
    vi.stubGlobal('localStorage', { getItem: () => text });
    expect(readPreferences()).toEqual({ size: 4, best: {} });
  });

  it('keeps play and in-memory records working when reads or writes throw', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('full'); },
    });
    const preferences = readPreferences();
    expect(preferences).toEqual({ size: 4, best: {} });
    expect(() => writePreferences(preferences)).not.toThrow();
    expect(recordBest(preferences, 4, 12)).toEqual({ size: 4, best: { 4: 12 } });
  });

  it('writes only a better record to its own key and retains records at other sizes', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    const preferences = { size: 4, best: { 4: 10, 6: 20 } } as const;
    expect(recordBest(preferences, 4, 10)).toBe(preferences);
    expect(recordBest(preferences, 4, 12)).toBe(preferences);
    expect(setItem).not.toHaveBeenCalled();
    const improved = recordBest(preferences, 4, 8);
    expect(improved).toEqual({ size: 4, best: { 4: 8, 6: 20 } });
    expect(setItem).toHaveBeenCalledExactlyOnceWith(PREFERENCES_KEY, JSON.stringify(improved));
  });
});
