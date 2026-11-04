import { MAX_SEED } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: Size, previousSeed?: number): GameState {
  const sample = new Uint32Array(1);
  crypto.getRandomValues(sample);
  let seed = ((sample[0] ?? 0) % MAX_SEED) + 1;
  if (seed === previousSeed) seed = (seed % MAX_SEED) + 1;
  const state = createGame(`np1-${size}-${seed}`);
  if (!state) throw new Error('Unable to create supported board');
  return state;
}
