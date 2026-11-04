import { createGame } from './state.ts';
import type { GameState } from './state.ts';

export function testGame(code = 'np1-4-1'): GameState {
  const state = createGame(code);
  if (!state) throw new Error(`Invalid test board: ${code}`);
  return state;
}
