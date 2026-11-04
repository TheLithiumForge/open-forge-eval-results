import { describe, expect, it } from 'vitest';
import { PREFERENCES_KEY, readPreferences, savePreferences } from './storage.ts';
import type { StoragePort } from './storage.ts';

function memory(text: string): StoragePort {
  return { getItem: () => text, setItem: () => {} };
}
describe('saved preferences', () => {
  it('validates sizes and capped, finite integer scores independently', () => {
    expect(readPreferences(memory(JSON.stringify({ size: 16, bests: { 4: 8, 6: -1, 8: 1.5, 10: '5', 12: 1000000, 14: 999999 } }))))
      .toEqual({ size: 16, bests: { 4: 8, 14: 999999 } });
    expect(readPreferences(memory('{"size":5,"bests":{"4":null}}'))).toEqual({ size: 4, bests: {} });
  });
  it.each(['{', 'null', '[]', '2', '{"size":"16"}'])('ignores invalid saved JSON %s', text => {
    expect(readPreferences(memory(text))).toEqual({ size: 4, bests: {} });
  });
  it('survives unavailable storage and writes only its own key', () => {
    const broken: StoragePort = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
    expect(readPreferences(broken)).toEqual({ size: 4, bests: {} });
    expect(() => savePreferences(broken, { size: 4, bests: {} })).not.toThrow();
    const writes: string[] = [];
    savePreferences({ getItem: () => null, setItem: key => { writes.push(key); } }, { size: 6, bests: {} });
    expect(writes).toEqual([PREFERENCES_KEY]);
    expect(readPreferences(null).size).toBe(4);
  });
});
