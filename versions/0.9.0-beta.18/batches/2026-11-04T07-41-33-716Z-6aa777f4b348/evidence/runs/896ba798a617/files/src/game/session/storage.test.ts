import { describe, expect, it, vi } from 'vitest';
import { PREFERENCES_KEY, readPreferences, writePreferences } from './storage.ts';

function memory(text: string | null) {
  const entries = new Map<string, string>([['unrelated', 'keep me']]);
  if (text !== null) entries.set(PREFERENCES_KEY, text);
  return { entries, getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); } };
}

describe('saved preferences', () => {
  it('restores only supported sizes and finite integer scores within the move cap', () => {
    const storage = memory(JSON.stringify({ size: 16,
      best: { 4: 8, 6: 999999, 8: -1, 10: 1.5, 12: 1000000, 14: '98', 16: 128, 3: 2 } }));
    expect(readPreferences(storage)).toEqual({ size: 16, best: { 4: 8, 6: 999999, 16: 128 } });
    expect(readPreferences(memory('{"size":5,"best":{"4":8}}'))).toEqual({ size: 4, best: { 4: 8 } });
  });
  it.each([null, '{', 'null', '[]', '1', '"oops"', '{"size":"8","best":null}'])
  ('ignores unavailable or malformed saved data %j', (text) => {
    expect(readPreferences(memory(text))).toEqual({ size: 4, best: {} });
  });
  it('catches storage read and write failures', () => {
    const storage = { getItem: () => { throw new Error('Unavailable'); },
      setItem: () => { throw new Error('Full'); } };
    expect(readPreferences(storage)).toEqual({ size: 4, best: {} });
    expect(readPreferences(null)).toEqual({ size: 4, best: {} });
    expect(() => writePreferences({ size: 8, best: { 8: 32 } }, storage)).not.toThrow();
  });
  it('writes only the game preference key and keeps progress out of storage', () => {
    const storage = memory(null);
    const write = vi.spyOn(storage, 'setItem');
    writePreferences({ size: 6, best: { 4: 8 } }, storage);
    expect(write).toHaveBeenCalledOnce();
    expect(storage.entries.get('unrelated')).toBe('keep me');
    expect(storage.entries.get(PREFERENCES_KEY)).toBe('{"size":6,"best":{"4":8}}');
  });
});
