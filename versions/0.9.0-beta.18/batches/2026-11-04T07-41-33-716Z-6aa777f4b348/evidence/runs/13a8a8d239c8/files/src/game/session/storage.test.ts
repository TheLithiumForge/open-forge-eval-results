import { describe, expect, it } from 'vitest';
import { readBestScores, readSavedSize, saveBestScore, saveSize, type StoragePort } from './storage.ts';

class MemoryStorage implements StoragePort {
  readonly values = new Map<string, string>();
  failReads = false;
  failWrites = false;

  getItem(key: string): string | null {
    if (this.failReads) throw new Error('Storage read failed.');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('Storage write failed.');
    this.values.set(key, value);
  }
}

describe('session storage', () => {
  it('validates preference sizes and keeps unrelated keys when saving', () => {
    const storage = new MemoryStorage();
    storage.values.set('other-app', 'keep');
    storage.values.set('neon-pairs.preferences.v1', '{"gridSize":5}');
    expect(readSavedSize(storage)).toBeNull();
    saveSize(12, storage);
    expect(readSavedSize(storage)).toBe(12);
    expect(storage.values.get('other-app')).toBe('keep');
  });

  it('accepts only finite supported best scores and improves per size', () => {
    const storage = new MemoryStorage();
    storage.values.set('neon-pairs.best.v1', '{"4":12,"6":1000000,"8":-1,"10":2.5,"32":1}');
    expect([...readBestScores(storage)]).toEqual([[4, 12]]);
    saveBestScore(4, 12, storage);
    saveBestScore(4, 11, storage);
    saveBestScore(6, 20, storage);
    expect([...readBestScores(storage)]).toEqual([[4, 11], [6, 20]]);
  });

  it('keeps storage read and write failures from interrupting play', () => {
    const storage = new MemoryStorage();
    storage.failReads = true;
    storage.failWrites = true;
    expect(readSavedSize(storage)).toBeNull();
    expect(readBestScores(storage).size).toBe(0);
    expect(() => saveSize(4, storage)).not.toThrow();
    expect(() => saveBestScore(4, 1, storage)).not.toThrow();
  });
});
