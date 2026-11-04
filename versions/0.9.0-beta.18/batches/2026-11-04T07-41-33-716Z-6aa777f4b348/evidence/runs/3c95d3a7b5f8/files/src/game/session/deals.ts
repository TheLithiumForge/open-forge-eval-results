import { MAX_SEED } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: GridSize, previousSeed?: number): GameState {
  let seed = Math.floor(Math.random() * MAX_SEED) + 1;
  if (seed === previousSeed) seed = seed % MAX_SEED + 1;
  return createGame(`np1-${size}-${seed}`);
}
