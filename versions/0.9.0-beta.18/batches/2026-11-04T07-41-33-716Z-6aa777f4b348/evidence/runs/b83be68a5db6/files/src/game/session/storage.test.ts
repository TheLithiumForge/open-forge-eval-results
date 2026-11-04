import { expect, it } from 'vitest';
import { preferencesKey, readPreferences, writePreferences } from './storage.ts';

it('validates saved preferences and scores independently', () => {
  const storage = { getItem: () => JSON.stringify({ size: 16, best: {
    4: 8, 6: 999999, 8: 1000000, 10: -1, 12: 1.5, 14: '98', 16: null, 5: 3,
  } }) };
  expect(readPreferences({ ...storage, setItem() {} })).toEqual({ size: 16, best: { 4: 8, 6: 999999 } });
  expect(readPreferences({ getItem: () => '{', setItem() {} })).toEqual({ size: 4, best: {} });
  expect(readPreferences({ getItem: () => '{"size":5}', setItem() {} }).size).toBe(4);
});

it('catches storage failures and touches only its own key', () => {
  const broken = { getItem(): never { throw new Error('denied'); }, setItem(): never { throw new Error('quota'); } };
  expect(readPreferences(broken)).toEqual({ size: 4, best: {} });
  expect(() => writePreferences(broken, { size: 4, best: {} })).not.toThrow();
  expect(readPreferences(null)).toEqual({ size: 4, best: {} });
  const values = new Map([['unrelated', 'keep']]);
  writePreferences({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } },
    { size: 6, best: { 6: 18 } });
  expect(values.get('unrelated')).toBe('keep');
  expect(values.get(preferencesKey)).toBe('{"size":6,"best":{"6":18}}');
});
