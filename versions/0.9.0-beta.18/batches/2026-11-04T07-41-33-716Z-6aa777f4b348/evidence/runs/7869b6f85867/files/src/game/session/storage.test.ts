import { expect, it } from 'vitest';
import { readPreferences, savePreferences, STORAGE_KEY } from './storage.ts';

it('validates saved sizes and capped finite integer scores independently', () => {
  const storage = { getItem: () => JSON.stringify({ size: 16, best: {
    4: 8, 6: -1, 8: 1.5, 10: 1000000, 12: '72', 14: null, 16: 999999, 18: 1,
  } }), setItem: () => {} };
  expect(readPreferences(storage)).toEqual({ size: 16, best: { 4: 8, 16: 999999 } });
});

it('handles corrupt, unavailable and failing storage', () => {
  for (const value of ['{', 'null', '[]', '{"size":5,"best":{"4":null}}']) {
    expect(readPreferences({ getItem: () => value, setItem: () => {} })).toEqual({ size: 4, best: {} });
  }
  const failed = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
  expect(readPreferences(failed)).toEqual({ size: 4, best: {} });
  expect(() => savePreferences(failed, { size: 4, best: {} })).not.toThrow();
  expect(readPreferences(null)).toEqual({ size: 4, best: {} });
});

it('writes only its own preference key', () => {
  const entries = new Map<string, string>([['unrelated', 'keep']]);
  savePreferences({ getItem: key => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } },
    { size: 6, best: { 6: 18 } });
  expect(entries.get('unrelated')).toBe('keep');
  expect(JSON.parse(entries.get(STORAGE_KEY) ?? '')).toEqual({ size: 6, best: { 6: 18 } });
});
