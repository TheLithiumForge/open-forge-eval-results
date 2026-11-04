import { MAX_BOARD_SEED, type BoardSize } from '../constants.ts';

export function freshBoardCode(size: BoardSize, currentCode?: string): string {
  let seed: number;
  try {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    seed = ((values[0] ?? 0) % MAX_BOARD_SEED) + 1;
  } catch {
    seed = (Date.now() % MAX_BOARD_SEED) + 1;
  }
  if (`np1-${size}-${seed}` === currentCode) seed = seed === MAX_BOARD_SEED ? 1 : seed + 1;
  return `np1-${size}-${seed}`;
}
