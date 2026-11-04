import { describe, expect, it } from 'vitest';
import { MAX_MOVES } from '../state.ts';
import { PREFERENCES_KEY, readPreferences, writePreferences } from './storage.ts';
import type { StoragePort } from './storage.ts';

function memory(text: string | null): StoragePort {
  return { getItem: () => text, setItem: () => {} };
}

describe('saved preferences and score boundaries (A05, R08, R10–R11)', () => {
  it('reads supported size and capped integer scores', () => {
    expect(readPreferences(memory(JSON.stringify({ size: 16, bests: { 4: 8, 16: MAX_MOVES } }))))
      .toEqual({ size: 16, bests: { 4: 8, 16: MAX_MOVES } });
  });
  it.each(['{', 'null', '[]', '{"size":5,"bests":{}}', '{"size":"4","bests":{}}',
    '{"size":4,"bests":{"4":-1}}', '{"size":4,"bests":{"4":1.5}}',
    '{"size":4,"bests":{"4":1000000}}', '{"size":4,"bests":{"04":8}}',
    '{"size":4,"bests":{"4":null}}', '{"size":4,"bests":{"4":"8"}}',
    '{"size":4,"bests":{"5":8}}', '{"size":4,"bests":[]}'])('ignores invalid saved data %s', text => {
    expect(readPreferences(memory(text))).toEqual({ size: 4, bests: {} });
  });
  it('catches read and write failures and permits unavailable storage', () => {
    const broken: StoragePort = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Full'); } };
    expect(readPreferences(broken)).toEqual({ size: 4, bests: {} });
    expect(readPreferences(null)).toEqual({ size: 4, bests: {} });
    expect(() => writePreferences(broken, { size: 4, bests: {} })).not.toThrow();
    expect(() => writePreferences(null, { size: 4, bests: {} })).not.toThrow();
  });
  it('uses only its own key without clearing unrelated storage', () => {
    const values = new Map([['unrelated', 'keep']]);
    const storage: StoragePort = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
    writePreferences(storage, { size: 6, bests: { 4: 8 } });
    expect(values.get('unrelated')).toBe('keep');
    expect(values.get(PREFERENCES_KEY)).toBe('{"size":6,"bests":{"4":8}}');
    expect(values.size).toBe(2);
  });
});
