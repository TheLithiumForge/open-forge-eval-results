import { MAX_SEED } from '../boardCode.ts';
import type { BoardSize } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: BoardSize, previousSeed?: number): GameState {
  const sample = new Uint32Array(1);
  try { crypto.getRandomValues(sample); }
  catch { sample[0] = Math.floor(Math.random() * 4294967296); }
  let seed = ((sample[0] ?? 0) % MAX_SEED) + 1;
  if (seed === previousSeed) seed = seed === MAX_SEED ? 1 : seed + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Could not create a supported deal.');
  return game;
}
