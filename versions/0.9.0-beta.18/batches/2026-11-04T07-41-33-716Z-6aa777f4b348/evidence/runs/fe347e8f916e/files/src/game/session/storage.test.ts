import { afterEach, expect, it, vi } from 'vitest';
import { BEST_KEY, PREFERENCES_KEY, readPreferences, recordBest, saveSize } from './storage.ts';

function storage() {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value) });
  return values;
}
afterEach(() => vi.unstubAllGlobals());
it('validates saved sizes and each finite integer capped score as unknown input', () => {
  const values = storage();
  values.set(PREFERENCES_KEY, '{"size":16}');
  values.set(BEST_KEY, '{"4":8,"6":12.5,"8":-1,"10":1000000,"12":"30","14":40,"16":null,"5":8}');
  expect(readPreferences()).toEqual({ size: 16, scores: { 4: 8, 14: 40 } });
  for (const json of ['{', 'null', '[]', '{"size":5}', '{"size":"4"}']) {
    values.set(PREFERENCES_KEY, json);
    expect(readPreferences().size).toBe(4);
  }
});
it('updates only better records and leaves unrelated keys alone', () => {
  const values = storage();
  values.set('unrelated', 'keep');
  let scores = recordBest({}, 4, 10);
  expect(recordBest(scores, 4, 10)).toBe(scores);
  expect(recordBest(scores, 4, 12)).toBe(scores);
  scores = recordBest(scores, 4, 8);
  saveSize(6);
  expect(scores[4]).toBe(8);
  expect(values.get('unrelated')).toBe('keep');
  expect(readPreferences()).toEqual({ size: 6, scores: { 4: 8 } });
});
it('catches storage read, parse and write failures', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); } });
  expect(readPreferences()).toEqual({ size: 4, scores: {} });
  expect(() => saveSize(16)).not.toThrow();
  expect(recordBest({}, 4, 8)).toEqual({ 4: 8 });
});
