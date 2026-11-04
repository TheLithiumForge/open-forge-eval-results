import { MAX_SEED } from '../board-code.ts';
import type { Size } from '../board-code.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshDeal(size: Size, previousCode?: string): GameState {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  let seed = (random[0] ?? 0) % MAX_SEED + 1;
  if (`np1-${size}-${seed}` === previousCode) seed = seed % MAX_SEED + 1;
  return createGame(`np1-${size}-${seed}`);
}
