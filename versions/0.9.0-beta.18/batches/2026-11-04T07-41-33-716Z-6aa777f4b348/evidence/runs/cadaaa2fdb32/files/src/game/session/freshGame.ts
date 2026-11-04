import { MAX_SEED } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: Size, previousSeed?: number): GameState {
  let random: number;
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    random = values[0] ?? 0;
  } catch { random = Math.floor(Math.random() * 4294967296); }
  let seed = random % MAX_SEED + 1;
  if (seed === previousSeed) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create a supported board.');
  return game;
}
