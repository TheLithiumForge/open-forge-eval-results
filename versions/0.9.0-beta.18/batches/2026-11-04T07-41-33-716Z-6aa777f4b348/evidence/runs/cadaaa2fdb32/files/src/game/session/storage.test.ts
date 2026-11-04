import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPreferences, savePreferences, STORAGE_KEY } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());
describe('defensive preference storage', () => {
  it('ignores invalid sizes and unsafe scores, retaining valid records', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ size: 5,
      best: { 4: 8, 6: -1, 8: 1.5, 10: 1000000, 12: '5', 14: 999999, 16: null, junk: 10 } }) });
    expect(readPreferences()).toEqual({ size: 4, best: { 4: 8, 14: 999999 } });
  });
  it('catches unavailable, malformed, and failing reads/writes', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readPreferences()).toEqual({ size: 4, best: {} });
    vi.stubGlobal('localStorage', { getItem: () => '{' });
    expect(readPreferences()).toEqual({ size: 4, best: {} });
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Quota'); },
    });
    expect(readPreferences()).toEqual({ size: 4, best: {} });
    expect(() => savePreferences({ size: 16, best: {} })).not.toThrow();
  });
  it('uses one dedicated key and persists valid values', () => {
    const setItem = vi.fn();
    const getItem = vi.fn(() => '{"size":16,"best":{"16":128}}');
    vi.stubGlobal('localStorage', { setItem, getItem });
    const preferences = readPreferences();
    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(preferences).toEqual({ size: 16, best: { 16: 128 } });
    savePreferences(preferences);
    expect(setItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, JSON.stringify(preferences));
  });
});
