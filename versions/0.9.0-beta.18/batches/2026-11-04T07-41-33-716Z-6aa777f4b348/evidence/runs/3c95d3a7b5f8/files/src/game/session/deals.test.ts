import { afterEach, expect, it, vi } from 'vitest';
import { MAX_SEED } from '../boardCode.ts';
import { freshGame } from './deals.ts';

afterEach(() => vi.restoreAllMocks());

it('creates valid seeds and ensures another deal differs from the previous seed', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  expect(freshGame(4).board.code).toBe('np1-4-1');
  expect(freshGame(4, 1).board.code).toBe('np1-4-2');
  vi.spyOn(Math, 'random').mockReturnValue(1 - Number.EPSILON);
  expect(freshGame(16).board.seed).toBe(MAX_SEED);
  expect(freshGame(16, MAX_SEED).board.seed).toBe(1);
});
