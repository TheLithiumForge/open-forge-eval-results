import { MAX_SEED } from '../deck.ts';
import type { GridSize } from '../deck.ts';
import { createGame } from '../transitions.ts';
import type { GameState } from '../model.ts';

export function freshGame(size: GridSize, previousSeed = 0): GameState {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  let seed = ((random[0] ?? 0) % MAX_SEED) + 1;
  if (seed === previousSeed) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Cannot create a supported board.');
  return game;
}
