import { MAX_SEED } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import { createGame } from '../createGame.ts';
import type { GameState } from '../state.ts';

export function freshGame(size: GridSize, previousSeed?: number): GameState {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const draw = random[0];
  if (draw === undefined) throw new Error('Unable to create a deal.');
  const candidate = (draw % MAX_SEED) + 1;
  const seed = candidate === previousSeed ? (candidate % MAX_SEED) + 1 : candidate;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create a deal.');
  return game;
}
