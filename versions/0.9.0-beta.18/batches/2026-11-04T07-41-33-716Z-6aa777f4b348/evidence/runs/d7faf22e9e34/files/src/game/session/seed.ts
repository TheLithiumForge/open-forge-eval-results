import { MAX_SEED } from '../boardCode.ts';
import type { SupportedSize } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

function randomSeed(): number {
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return (values[0] ?? 0) % MAX_SEED + 1;
  } catch { return Math.floor(Math.random() * MAX_SEED) + 1; }
}

export function freshGame(size: SupportedSize, previousSeed?: number): GameState {
  let seed = randomSeed();
  if (seed === previousSeed) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create a supported board');
  return game;
}
