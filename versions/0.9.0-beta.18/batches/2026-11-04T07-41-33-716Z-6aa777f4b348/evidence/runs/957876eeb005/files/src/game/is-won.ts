import type { GameState } from './state.ts';

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length;
}
