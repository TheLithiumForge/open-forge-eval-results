import { MAX_SEED } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { createGame } from '../model.ts';
import type { GameState } from '../model.ts';

export function freshDeal(size: Size, previousCode?: string): GameState {
  const bytes = new Uint32Array(1);
  let seed: number;
  try {
    crypto.getRandomValues(bytes);
    seed = ((bytes[0] ?? 0) % MAX_SEED) + 1;
  } catch { seed = Math.floor(Math.random() * MAX_SEED) + 1; }
  if (`np1-${size}-${seed}` === previousCode) seed = (seed % MAX_SEED) + 1;
  const state = createGame(`np1-${size}-${seed}`);
  if (!state) throw new Error('Could not create a deal.');
  return state;
}
