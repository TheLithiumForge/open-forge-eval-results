import { describe, expect, it } from 'vitest';
import { keepBest, PREFERENCES_KEY, readPreferences, writePreferences } from './storage.ts';
import type { PreferenceStorage, Preferences } from './storage.ts';

function memoryStorage(text: string | null = null) {
  const values = new Map<string, string>([['unrelated', 'keep me']]);
  if (text !== null) values.set(PREFERENCES_KEY, text);
  const storage: PreferenceStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  return { storage, values };
}

describe('saved preferences', () => {
  it('defaults to four columns without a saved game', () => {
    expect(readPreferences(() => memoryStorage().storage)).toEqual({ size: 4, best: {} });
  });

  it.each(['{', 'null', '[]', 'true', '"text"'])('ignores malformed or non-object saved JSON: %s', text => {
    expect(readPreferences(() => memoryStorage(text).storage)).toEqual({ size: 4, best: {} });
  });

  it('accepts supported sizes and validates every score independently', () => {
    const text = JSON.stringify({ size: 16, best: { 4: 8, 6: -1, 8: 1.5, 10: '50', 12: 1000000, 14: 999999, 16: 128, 5: 1 } });
    expect(readPreferences(() => memoryStorage(text).storage)).toEqual({ size: 16, best: { 4: 8, 14: 999999, 16: 128 } });
  });

  it.each([5, '4', null, 4.5])('rejects an unsupported saved size: %s', size => {
    expect(readPreferences(() => memoryStorage(JSON.stringify({ size, best: {} })).storage).size).toBe(4);
  });

  it('rejects non-finite saved scores', () => {
    expect(readPreferences(() => memoryStorage('{"size":4,"best":{"4":1e999}}').storage).best).toEqual({});
  });

  it('catches denied storage access and read failures', () => {
    const denied = () => { throw new Error('denied'); };
    expect(readPreferences(denied)).toEqual({ size: 4, best: {} });
    expect(readPreferences(() => ({ getItem: denied, setItem: () => undefined }))).toEqual({ size: 4, best: {} });
  });

  it('writes only its own key, with no active progress', () => {
    const { storage, values } = memoryStorage();
    const preferences: Preferences = { size: 8, best: { 4: 8 } };
    writePreferences(() => storage, preferences);
    expect(values.get('unrelated')).toBe('keep me');
    expect(values.size).toBe(2);
    expect(JSON.parse(values.get(PREFERENCES_KEY) ?? '')).toEqual(preferences);
  });

  it('catches denied access and failed writes', () => {
    const denied = () => { throw new Error('quota'); };
    const preferences: Preferences = { size: 4, best: {} };
    expect(() => writePreferences(denied, preferences)).not.toThrow();
    expect(() => writePreferences(() => ({ getItem: () => null, setItem: denied }), preferences)).not.toThrow();
  });

  it('keeps a better score in memory and preserves equal or worse records', () => {
    const original: Preferences = { size: 6, best: { 4: 12, 6: 20 } };
    const improved = keepBest(original, 4, 8);
    expect(improved.best).toEqual({ 4: 8, 6: 20 });
    expect(original.best[4]).toBe(12);
    expect(keepBest(improved, 4, 8)).toBe(improved);
    expect(keepBest(improved, 4, 10)).toBe(improved);
    expect(keepBest(improved, 8, 32).best[8]).toBe(32);
  });
});
