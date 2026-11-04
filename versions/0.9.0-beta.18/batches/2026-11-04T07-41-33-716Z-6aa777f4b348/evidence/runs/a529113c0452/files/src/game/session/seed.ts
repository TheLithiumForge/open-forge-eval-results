import { MAX_SEED } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

function browserSeed(): number {
  try {
    const value = crypto.getRandomValues(new Uint32Array(1))[0];
    if (value !== undefined) return value % MAX_SEED + 1;
  } catch { /* An ordinary browser random draw also supplies a deal seed. */ }
  return Math.floor(Math.random() * MAX_SEED) + 1;
}

export function freshGame(size: GridSize, previousSeed?: number): GameState {
  const drawn = browserSeed();
  const seed = drawn === previousSeed ? drawn % MAX_SEED + 1 : drawn;
  const game = createGame(`np1-${size}-${seed}`);
  if (game === null) throw new Error('Unable to create a valid deal.');
  return game;
}
