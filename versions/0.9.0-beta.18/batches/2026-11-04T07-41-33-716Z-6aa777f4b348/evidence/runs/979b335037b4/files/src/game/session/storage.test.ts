import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPreferences, STORAGE_KEY, writePreferences } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());

describe('optional saved preferences', () => {
  it('validates unknown preferences and keeps only supported finite scores', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ size: 16,
      bests: { 4: 8, 6: -1, 8: 999999, 10: 1000000, 12: 12.5, 14: '2', 16: null, 3: 5 } }) });
    expect(readPreferences()).toEqual({ size: 16, bests: { 4: 8, 8: 999999 } });
  });
  it.each(['{', 'null', '[]', '{"size":5}', '{"size":"4"}'])('ignores invalid saved JSON: %s', text => {
    vi.stubGlobal('localStorage', { getItem: () => text });
    expect(readPreferences()).toEqual({ size: 4, bests: {} });
  });
  it('survives read and write failures and writes only its own key', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied'); },
      setItem: () => { throw new Error('Denied'); } });
    expect(readPreferences()).toEqual({ size: 4, bests: {} });
    expect(() => writePreferences({ size: 4, bests: {} })).not.toThrow();
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    writePreferences({ size: 6, bests: { 4: 8 } });
    expect(setItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, '{"size":6,"bests":{"4":8}}');
  });
});
