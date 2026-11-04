import { describe, expect, it } from 'vitest';
import { readBestScores, readPreferences, writeBestScores, writePreferences } from './storage.ts';
import { MemoryStorage } from './testing.ts';

describe('session storage', () => {
  it('persists only supported grid sizes and bounded move scores', () => {
    const storage = new MemoryStorage();
    storage.setItem('unrelated', 'keep');
    writePreferences(storage, 16);
    writeBestScores(storage, { 4: 8, 6: 999_999, 8: 1_000_000, 10: -1 });
    expect(readPreferences(storage)).toEqual({ size: 16 });
    expect(readBestScores(storage)).toEqual({ 4: 8, 6: 999_999 });
    expect(storage.getItem('unrelated')).toBe('keep');
  });

  it('ignores invalid saved sizes, malformed JSON, and individual invalid scores', () => {
    const storage = new MemoryStorage();
    storage.setItem('neon-pairs:preferences:v1', JSON.stringify({ version: 1, size: 5 }));
    storage.setItem('neon-pairs:best-scores:v1', JSON.stringify({
      version: 1, scores: { 4: 8, 6: 1.5, 8: '9', 10: 1_000_000, 5: 7 },
    }));
    expect(readPreferences(storage)).toBeNull();
    expect(readBestScores(storage)).toEqual({ 4: 8 });
    storage.setItem('neon-pairs:preferences:v1', '{');
    storage.setItem('neon-pairs:best-scores:v1', '{');
    expect(readPreferences(storage)).toBeNull();
    expect(readBestScores(storage)).toEqual({});
  });

  it('catches disabled or failing storage operations', () => {
    const failingStorage = {
      getItem: (_key: string): string => { throw new Error('blocked'); },
      setItem: (_key: string, _value: string): void => { throw new Error('blocked'); },
    };
    expect(readPreferences(null)).toBeNull();
    expect(readBestScores(null)).toEqual({});
    expect(readPreferences(failingStorage)).toBeNull();
    expect(readBestScores(failingStorage)).toEqual({});
    writePreferences(failingStorage, 4);
    writeBestScores(failingStorage, { 4: 8 });
  });
});
