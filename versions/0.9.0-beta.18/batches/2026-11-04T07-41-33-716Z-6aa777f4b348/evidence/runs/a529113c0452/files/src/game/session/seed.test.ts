import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_SEED } from '../boardCode.ts';
import { freshGame } from './seed.ts';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function draw(value: number): void {
  vi.stubGlobal('crypto', { getRandomValues: (array: Uint32Array) => {
    array[0] = value;
    return array;
  } });
}

describe('fresh session seeds', () => {
  it('uses a new seed even when the external source repeats', () => {
    draw(41);
    expect(freshGame(4).board.code).toBe('np1-4-42');
    expect(freshGame(4, 42).board.code).toBe('np1-4-43');
    draw(MAX_SEED - 1);
    expect(freshGame(16, MAX_SEED).board.code).toBe('np1-16-1');
  });

  it('keeps play available when browser crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(freshGame(6).board.code).toBe('np1-6-1');
    expect(freshGame(6, 1).board.code).toBe('np1-6-2');
  });
});
