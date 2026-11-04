import { afterEach, expect, test, vi } from 'vitest';
import { BEST_KEY, PREFERENCES_KEY, readBests, readSize, saveBest, saveSize } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());
function memoryStorage() {
  const map = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => map.set(key, value) });
  return map;
}
test('ignores malformed preferences and invalid finite integer best scores', () => {
  const store = memoryStorage();
  for (const value of ['{', 'null', '4', '{"size":5}', '{"size":"6"}']) {
    store.set(PREFERENCES_KEY, value); expect(readSize()).toBe(4);
  }
  saveSize(16); expect(readSize()).toBe(16);
  store.set(BEST_KEY, '{"4":8,"6":-1,"8":1.5,"10":1000000,"12":"12","14":null,"16":999999}');
  expect(readBests()).toEqual({ 4: 8, 16: 999999 });
});
test('keeps only better results, keeps sizes separate and preserves unrelated keys', () => {
  const store = memoryStorage();
  store.set('unrelated', 'keep');
  let best = saveBest({}, 4, 12);
  expect(saveBest(best, 4, 12)).toBe(best);
  expect(saveBest(best, 4, 15)).toBe(best);
  best = saveBest(best, 4, 8);
  best = saveBest(best, 6, 18);
  expect(readBests()).toEqual({ 4: 8, 6: 18 });
  expect(store.get('unrelated')).toBe('keep');
});
test('storage denial and write failures remain playable for the session', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Full'); } });
  expect(readSize()).toBe(4);
  expect(readBests()).toEqual({});
  expect(() => saveSize(6)).not.toThrow();
  expect(saveBest({}, 4, 8)).toEqual({ 4: 8 });
});
