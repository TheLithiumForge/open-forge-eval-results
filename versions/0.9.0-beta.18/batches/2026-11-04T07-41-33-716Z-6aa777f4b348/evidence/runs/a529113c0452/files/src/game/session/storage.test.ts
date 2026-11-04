import { afterEach, describe, expect, it, vi } from 'vitest';
import { bestKey, browserStorage, readPreferences, saveBest, saveSize, SIZE_KEY } from './storage.ts';
import type { SessionStorage } from './storage.ts';

function memoryStorage(entries: readonly (readonly [string, string])[] = []) {
  const values = new Map(entries);
  const storage: SessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  return { storage, values };
}

afterEach(() => vi.unstubAllGlobals());

describe('saved preferences', () => {
  it('restores a supported size and bounded whole bests independently', () => {
    const { storage } = memoryStorage([
      [SIZE_KEY, '16'], [bestKey(4), '0'], [bestKey(6), '999999'],
      [bestKey(8), '1000000'], [bestKey(10), '1.5'], [bestKey(12), '-1'], [bestKey(14), '"4"'],
    ]);
    expect(readPreferences(storage)).toEqual({ size: 16, bests: { 4: 0, 6: 999999 } });
  });

  it.each(['5', 'null', '"8"', '{}', '[4]', '{', 'Infinity'])('ignores invalid saved size %s', (text) => {
    const { storage } = memoryStorage([[SIZE_KEY, text], [bestKey(4), '8']]);
    expect(readPreferences(storage)).toEqual({ size: 4, bests: { 4: 8 } });
  });

  it.each(['null', 'NaN', '1e400', '{}', 'true', '9007199254740992'])('ignores invalid saved best %s', (text) => {
    const { storage } = memoryStorage([[bestKey(4), text]]);
    expect(readPreferences(storage).bests).toEqual({});
  });

  it('writes only its own keys and preserves unrelated storage', () => {
    const { storage, values } = memoryStorage([['other-app', 'keep']]);
    saveSize(storage, 12);
    saveBest(storage, 12, 73);
    expect([...values]).toEqual([['other-app', 'keep'], [SIZE_KEY, '12'], [bestKey(12), '73']]);
  });

  it('survives getter, read and write failures', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('Blocked'); } });
    expect(browserStorage()).toBeNull();
    const storage: SessionStorage = {
      getItem: () => { throw new Error('Blocked'); },
      setItem: () => { throw new Error('Full'); },
    };
    expect(readPreferences(storage)).toEqual({ size: 4, bests: {} });
    expect(() => { saveSize(storage, 4); saveBest(storage, 4, 8); }).not.toThrow();
    expect(readPreferences(null)).toEqual({ size: 4, bests: {} });
    expect(() => { saveSize(null, 4); saveBest(null, 4, 8); }).not.toThrow();
  });
});
