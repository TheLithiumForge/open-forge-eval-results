import { MAX_SEED } from '../board.ts';
import type { BoardSize } from '../board.ts';
import { createBoardCode } from '../board.ts';

export function freshBoardCode(size: BoardSize, currentCode?: string): string {
  let seed = 1;
  try {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    seed = ((bytes[0] ?? 0) % MAX_SEED) + 1;
  } catch {
    seed = Math.floor(Math.random() * MAX_SEED) + 1;
  }
  let code = createBoardCode(size, seed);
  if (code === currentCode) {
    seed = seed === MAX_SEED ? 1 : seed + 1;
    code = createBoardCode(size, seed);
  }
  return code;
}
