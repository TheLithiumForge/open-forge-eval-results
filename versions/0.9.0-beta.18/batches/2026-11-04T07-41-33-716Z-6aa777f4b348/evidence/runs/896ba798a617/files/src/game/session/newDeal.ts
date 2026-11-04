import { MAX_SEED } from '../boardCode.ts';
import type { BoardSize } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';

export function newDeal(size: BoardSize, previousCode?: string): GameState {
  const random = new Uint32Array(1);
  let value: number;
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(random);
    value = random[0] ?? 0;
  } else value = Math.floor(Math.random() * MAX_SEED);
  let seed = value % MAX_SEED + 1;
  if (`np1-${size}-${seed}` === previousCode) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create supported deal');
  return game;
}
