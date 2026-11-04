import { MAX_SEED } from '../board-code.ts';
import type { GridSize } from '../board-code.ts';
import { createGame } from '../create-game.ts';
import type { GameState } from '../state.ts';

function randomSeed(): number {
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const value = values[0];
    if (value !== undefined) return value % MAX_SEED + 1;
  } catch {
    // Fresh deals still work where a secure random source is unavailable.
  }
  return Math.floor(Math.random() * MAX_SEED) + 1;
}

export function freshGame(size: GridSize, previousSeed?: number): GameState {
  const candidate = randomSeed();
  const seed = candidate === previousSeed ? candidate % MAX_SEED + 1 : candidate;
  const game = createGame(`np1-${size}-${seed}`);
  if (game === null) throw new Error('Unable to create a supported deal');
  return game;
}
