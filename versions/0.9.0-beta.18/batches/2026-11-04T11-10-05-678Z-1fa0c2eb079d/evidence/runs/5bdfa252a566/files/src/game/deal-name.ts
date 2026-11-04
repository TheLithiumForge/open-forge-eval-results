import type { GameState } from './game.ts';

export const DEAL_NAME_MAX_LENGTH = 40;

export function isValidDealName(value: unknown): value is string {
  return typeof value === 'string' && value.length <= DEAL_NAME_MAX_LENGTH && !/[\r\n]/.test(value);
}

export function renameGame(state: GameState, name: string): GameState {
  if (!isValidDealName(name) || name === state.name) return state;
  return { ...state, name };
}
