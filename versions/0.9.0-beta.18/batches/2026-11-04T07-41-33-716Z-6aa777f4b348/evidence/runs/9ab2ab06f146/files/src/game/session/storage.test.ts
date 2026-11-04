import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPreferences, STORAGE_KEY, writePreferences } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());
describe('untrusted preferences', () => {
  it('validates sizes and capped integer bests and leaves other keys alone', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem, getItem: () => JSON.stringify({ size: 16,
      best: { 4: 8, 6: -1, 8: 1.2, 10: 1000000, 12: 999999, 14: '12', 16: null, '04': 7 } }) });
    expect(readPreferences()).toEqual({ size: 16, best: { 4: 8, 12: 999999 } });
    writePreferences({ size: 4, best: { 4: 8 } });
    expect(setItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, '{"size":4,"best":{"4":8}}');
  });
  it.each(['{', 'null', '[]', '{"size":5,"best":null}'])('ignores malformed preferences %s', text => {
    vi.stubGlobal('localStorage', { getItem: () => text });
    expect(readPreferences()).toEqual({ size: 4, best: {} });
  });
  it('catches storage read and write failures', () => {
    vi.stubGlobal('localStorage', { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } });
    expect(readPreferences()).toEqual({ size: 4, best: {} });
    expect(() => writePreferences({ size: 4, best: {} })).not.toThrow();
  });
});
