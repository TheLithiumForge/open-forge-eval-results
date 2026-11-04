import { MAX_SEED } from '../deal.ts';
import type { Size } from '../deal.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshDeal(size: Size, previousCode?: string): GameState {
  const sample = new Uint32Array(1);
  crypto.getRandomValues(sample);
  let seed = ((sample[0] ?? 0) % MAX_SEED) + 1;
  if ('np1-' + size + '-' + seed === previousCode) seed = seed % MAX_SEED + 1;
  const state = createGame('np1-' + size + '-' + seed);
  if (!state) throw new Error('Unable to create a deal.');
  return state;
}
