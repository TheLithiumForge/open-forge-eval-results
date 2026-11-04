import { describe, expect, it } from 'vitest';
import type { StoragePort } from './storage.ts';
import { readBestScores, readPreferredSize, storeBest, writePreferredSize } from './storage.ts';

class MemoryStorage implements StoragePort {
  readonly values = new Map<string, string>([['other-app', 'untouched']]);
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('session storage', () => {
  it('ignores invalid preferences and filters saved scores', () => {
    const storage = new MemoryStorage();
    storage.values.set('neon-pairs.preferences.v1', '{"size":5}');
    storage.values.set('neon-pairs.best.v1', '{"4":12,"6":1.5,"8":1000000,"16":0,"99":4}');
    expect(readPreferredSize(storage)).toBeNull();
    expect(readBestScores(storage)).toEqual({ 4: 12, 16: 0 });
  });

  it('keeps bests in memory and persists only improvements', () => {
    const storage = new MemoryStorage();
    const first = storeBest(4, 12, {}, storage);
    expect(first).toEqual({ 4: 12 });
    expect(storeBest(4, 14, first, storage)).toEqual({ 4: 12 });
    expect(storeBest(4, 9, first, storage)).toEqual({ 4: 9 });
    expect(storage.getItem('other-app')).toBe('untouched');
    writePreferredSize(16, storage);
    expect(readPreferredSize(storage)).toBe(16);
  });

  it('keeps play available when storage reads and writes fail', () => {
    const broken: StoragePort = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota'); }
    };
    expect(readPreferredSize(broken)).toBeNull();
    expect(readBestScores(broken)).toEqual({});
    expect(storeBest(4, 7, {}, broken)).toEqual({ 4: 7 });
    expect(() => writePreferredSize(4, broken)).not.toThrow();
  });
});
