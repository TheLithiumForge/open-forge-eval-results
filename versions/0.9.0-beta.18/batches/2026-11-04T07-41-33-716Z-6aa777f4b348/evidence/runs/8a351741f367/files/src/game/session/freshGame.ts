import { MAX_SEED } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: Size, previousSeed?: number): GameState {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const random = bytes[0];
  if (random === undefined) throw new Error('Unable to create a deal.');
  let seed = random % MAX_SEED + 1;
  if (seed === previousSeed) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create a deal.');
  return game;
}
