import { describe, expect, it } from 'vitest';
import { PREFERENCES_KEY, readPreferences, savePreferences } from './storage.ts';
import type { PreferenceStorage } from './storage.ts';

function storage(text: string | null): PreferenceStorage & { readonly writes: Map<string, string> } {
  const writes = new Map<string, string>();
  return { writes, getItem: key => key === PREFERENCES_KEY ? text : null,
    setItem: (key, value) => { writes.set(key, value); } };
}

describe('saved preferences', () => {
  it('loads supported sizes and capped integer best scores', () => {
    const source = storage(JSON.stringify({ version: 1, size: 16, best: { 4: 8, 16: 999999 } }));
    expect(readPreferences(source)).toEqual({ size: 16, best: { 4: 8, 16: 999999 } });
  });

  it.each([
    null, '{', 'null', '[]', JSON.stringify({ version: 2, size: 4, best: {} }),
    JSON.stringify({ version: 1, size: 5, best: {} }),
    JSON.stringify({ version: 1, size: '4', best: {} }),
    JSON.stringify({ version: 1, size: 4, best: { 5: 10 } }),
    JSON.stringify({ version: 1, size: 4, best: { '04': 10 } }),
    JSON.stringify({ version: 1, size: 4, best: { 4: -1 } }),
    JSON.stringify({ version: 1, size: 4, best: { 4: 1.5 } }),
    JSON.stringify({ version: 1, size: 4, best: { 4: 1000000 } }),
    '{"version":1,"size":4,"best":{"4":1e999}}',
    JSON.stringify({ version: 1, size: 4, best: { 4: '8' } }),
    JSON.stringify({ version: 1, size: 4, best: {}, extra: true }),
  ])('ignores invalid saved data %s', text => {
    expect(readPreferences(storage(text))).toEqual({ size: 4, best: {} });
  });

  it('catches read and write failures and keeps other storage keys untouched', () => {
    const unavailable = { getItem: () => { throw new Error('Blocked'); },
      setItem: () => { throw new Error('Blocked'); } };
    expect(readPreferences(unavailable)).toEqual({ size: 4, best: {} });
    expect(() => savePreferences({ size: 4, best: {} }, unavailable)).not.toThrow();
    const source = storage(null);
    source.writes.set('other-app', 'keep');
    savePreferences({ size: 6, best: { 4: 8 } }, source);
    expect(source.writes.size).toBe(2);
    expect(source.writes.get('other-app')).toBe('keep');
    expect(JSON.parse(source.writes.get(PREFERENCES_KEY) ?? '')).toEqual({ version: 1, size: 6, best: { 4: 8 } });
  });
});
