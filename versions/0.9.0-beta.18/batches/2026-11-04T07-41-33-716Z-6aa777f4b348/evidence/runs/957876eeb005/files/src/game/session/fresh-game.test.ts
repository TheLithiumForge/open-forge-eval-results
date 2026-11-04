import { afterEach, expect, it, vi } from 'vitest';
import { freshGame } from './fresh-game.ts';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('avoids reusing the current seed even when the random source repeats', () => {
  vi.stubGlobal('crypto', { getRandomValues: (values: Uint32Array) => values.fill(0) });
  const first = freshGame(4);
  expect(first.board.code).toBe('np1-4-1');
  expect(freshGame(4, first.board.seed).board.code).toBe('np1-4-2');
  expect(freshGame(16, first.board.seed).board.code).toBe('np1-16-2');
});

it('can create a supported deal without crypto access', () => {
  vi.stubGlobal('crypto', { getRandomValues: () => { throw new Error('Unavailable'); } });
  vi.spyOn(Math, 'random').mockReturnValue(0);
  expect(freshGame(6).board.code).toBe('np1-6-1');
  expect(freshGame(6, 1).board.code).toBe('np1-6-2');
});
