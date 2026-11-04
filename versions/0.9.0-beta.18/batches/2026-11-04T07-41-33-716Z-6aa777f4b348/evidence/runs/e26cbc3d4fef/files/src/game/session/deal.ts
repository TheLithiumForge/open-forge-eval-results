import { MAX_SEED } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import { createGame } from '../game.ts';

export function freshSeed(previous?: number, random: () => number = Math.random): number {
  const seed = Math.floor(random() * MAX_SEED) + 1;
  return seed === previous ? seed % MAX_SEED + 1 : seed;
}

export function freshDeal(size: GridSize, previousSeed?: number) {
  return createGame(`np1-${size}-${freshSeed(previousSeed)}`);
}
