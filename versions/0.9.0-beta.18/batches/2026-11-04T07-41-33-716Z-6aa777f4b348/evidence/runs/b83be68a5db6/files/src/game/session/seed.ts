import { boardVersion, seedLimit } from '../deal.ts';
import type { Size } from '../deal.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: Size, previousSeed?: number): GameState {
  const values = new Uint32Array(1);
  const limit = Math.floor(4294967296 / seedLimit) * seedLimit;
  let seed = 0;
  do {
    crypto.getRandomValues(values);
    const value = values[0];
    if (value !== undefined && value < limit) seed = value % seedLimit + 1;
  } while (seed === 0 || seed === previousSeed);
  const state = createGame(`${boardVersion}-${size}-${seed}`);
  if (!state) throw new Error('Unable to create a board');
  return state;
}
