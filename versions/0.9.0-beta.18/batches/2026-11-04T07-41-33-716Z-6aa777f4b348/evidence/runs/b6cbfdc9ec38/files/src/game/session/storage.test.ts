import { describe, expect, it } from 'vitest';
import { PREFERENCES_KEY, readPreferences, writePreferences } from './storage.ts';
import type { PreferenceStorage } from './storage.ts';

function storage(text: string | null): PreferenceStorage {
  return { getItem: () => text, setItem: () => {} };
}

describe('session preferences', () => {
  it('validates supported sizes and each integer best score independently', () => {
    const text = JSON.stringify({
      version: 1, size: 16,
      best: { 4: 8, 6: 999999, 8: 1.5, 10: -1, 12: 1000000, 14: '20', 16: 128, 5: 2 },
    });
    expect(readPreferences(() => storage(text))).toEqual({ size: 16, best: { 4: 8, 6: 999999, 16: 128 } });
    expect(readPreferences(() => storage('{"version":1,"size":"6","best":{"4":8}}')))
      .toEqual({ size: 4, best: { 4: 8 } });
  });

  it.each([null, '', '{', 'null', '[]', '{}', '{"version":2,"size":16}',
    '{"version":1,"size":5,"best":[]}',
    '{"version":1,"best":{"4":1e400,"6":9007199254740992}}',
  ])('ignores unusable saved input %j', (text) => {
    expect(readPreferences(() => storage(text))).toEqual({ size: 4, best: {} });
  });

  it('catches unavailable storage, throwing accessors and read/write failures', () => {
    const failure = (): never => { throw new Error('denied'); };
    expect(readPreferences(failure)).toEqual({ size: 4, best: {} });
    expect(readPreferences(() => null)).toEqual({ size: 4, best: {} });
    expect(readPreferences(() => ({ getItem: failure, setItem: failure })))
      .toEqual({ size: 4, best: {} });
    expect(() => writePreferences({ size: 4, best: {} }, failure)).not.toThrow();
    expect(() => writePreferences({ size: 4, best: {} }, () => ({ getItem: failure, setItem: failure })))
      .not.toThrow();
  });

  it('writes only its own key and round trips records', () => {
    const map = new Map([['unrelated', 'untouched']]);
    const local: PreferenceStorage = {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => { map.set(key, value); },
    };
    const preferences = { size: 6, best: { 4: 8, 6: 20 } } as const;
    writePreferences(preferences, () => local);
    expect(map.size).toBe(2);
    expect(map.get('unrelated')).toBe('untouched');
    expect(map.has(PREFERENCES_KEY)).toBe(true);
    expect(readPreferences(() => local)).toEqual(preferences);
  });
});
