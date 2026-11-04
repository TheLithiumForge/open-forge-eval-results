import { afterEach, expect, it, vi } from 'vitest';
import { readBest, readSize, saveBest, saveSize } from './storage.ts';

afterEach(() => vi.unstubAllGlobals());

it('validates preferences and best scores and preserves unrelated keys', () => {
  const entries = new Map<string, string>([
    ['unrelated', 'keep me'], ['neon-pairs.size.v1', '16'],
    ['neon-pairs.best.v1', '{"4":8,"6":999999,"8":1000000,"10":2.5,"12":-1,"14":"1"}'],
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  });
  expect(readSize()).toBe(16);
  expect(readBest()).toEqual({ 4: 8, 6: 999999 });
  saveSize(6); saveBest({ 6: 18 });
  expect(readSize()).toBe(6);
  expect(readBest()).toEqual({ 6: 18 });
  expect(entries.get('unrelated')).toBe('keep me');
  entries.set('neon-pairs.size.v1', '5');
  entries.set('neon-pairs.best.v1', '{');
  expect(readSize()).toBe(4);
  expect(readBest()).toEqual({});
});

it('survives denied storage reads and writes', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); },
  });
  expect(readSize()).toBe(4); expect(readBest()).toEqual({});
  expect(() => { saveSize(6); saveBest({ 4: 8 }); }).not.toThrow();
});
