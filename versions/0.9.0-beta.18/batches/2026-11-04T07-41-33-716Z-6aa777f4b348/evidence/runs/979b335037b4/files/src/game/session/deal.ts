import { MAX_SEED } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: Size, previousSeed = 0): GameState {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  let seed = ((random[0] ?? 0) % MAX_SEED) + 1;
  if (seed === previousSeed) seed = (seed % MAX_SEED) + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create a supported deal');
  return game;
}
