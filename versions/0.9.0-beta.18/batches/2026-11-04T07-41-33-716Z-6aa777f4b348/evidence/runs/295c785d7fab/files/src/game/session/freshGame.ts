import { MAX_SEED } from '../deck.ts';
import type { GridSize } from '../deck.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: GridSize, previousSeed?: number): GameState {
  let value: number;
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    value = values[0] ?? 0;
  } catch { value = Math.floor(Math.random() * 4294967296); }
  let seed = value % MAX_SEED + 1;
  if (seed === previousSeed) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create a supported board.');
  return game;
}
