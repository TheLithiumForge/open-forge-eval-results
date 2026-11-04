import { MAX_SEED } from '../board.ts';
import type { Size } from '../board.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: Size, previousCode = ''): GameState {
  let draw: number;
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    draw = values[0] ?? 0;
  } catch { draw = Math.floor(Math.random() * 4294967296); }
  let seed = draw % MAX_SEED + 1;
  if (`np1-${size}-${seed}` === previousCode) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create deal.');
  return game;
}
