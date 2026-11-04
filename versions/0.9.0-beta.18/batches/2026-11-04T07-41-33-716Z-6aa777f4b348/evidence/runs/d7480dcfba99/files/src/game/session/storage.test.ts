import { expect, it } from 'vitest';
import { PREFERENCES_KEY, readPreferences, writePreferences } from './storage.ts';

it('validates preferences and ignores corrupt or unavailable storage', () => {
  const storage = (text: string) => ({ getItem: () => text, setItem: () => {} });
  expect(readPreferences(storage('{'))).toEqual({ size: 4, best: {} });
  expect(readPreferences(storage('null'))).toEqual({ size: 4, best: {} });
  expect(readPreferences(storage(JSON.stringify({ size: 3, best: { 4: 5, 6: -1, 8: 1000000, 10: 1.5, 12: '2', 14: 999999, '04': 2 } }))))
    .toEqual({ size: 4, best: { 4: 5, 14: 999999 } });
  expect(readPreferences(storage('{"size":16,"best":{"16":128}}'))).toEqual({ size: 16, best: { 16: 128 } });
  const unavailable = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  expect(readPreferences(unavailable)).toEqual({ size: 4, best: {} });
  expect(() => writePreferences(unavailable, { size: 4, best: {} })).not.toThrow();
  expect(readPreferences(null)).toEqual({ size: 4, best: {} });
});
it('writes only the dedicated key', () => {
  const entries = new Map([['unrelated', 'keep']]);
  writePreferences({ getItem: key => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } }, { size: 6, best: { 6: 18 } });
  expect(entries.get('unrelated')).toBe('keep');
  expect(entries.has(PREFERENCES_KEY)).toBe(true);
});
