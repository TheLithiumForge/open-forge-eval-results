import { MAX_SEED, type BoardSize } from '../constants.ts';

export function createFreshBoardCode(size: BoardSize): string {
  let seed: number;
  try {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    seed = (values[0] ?? 0) % MAX_SEED + 1;
  } catch {
    seed = Math.floor(Math.random() * MAX_SEED) + 1;
  }
  return `np1-${size}-${seed}`;
}
