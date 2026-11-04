import type { GridSize } from '../board.ts';

const MAX_SEED = 2_147_483_646;

export function newBoardCode(size: GridSize, previousSeed?: number): string {
  const values = new Uint32Array(1);
  let value: number;
  try {
    value = window.crypto.getRandomValues(values)[0] ?? 0;
  } catch {
    value = Math.floor(Math.random() * MAX_SEED);
  }
  let seed = (value % MAX_SEED) + 1;
  if (seed === previousSeed) seed = seed === MAX_SEED ? 1 : seed + 1;
  return `np1-${size}-${seed}`;
}
