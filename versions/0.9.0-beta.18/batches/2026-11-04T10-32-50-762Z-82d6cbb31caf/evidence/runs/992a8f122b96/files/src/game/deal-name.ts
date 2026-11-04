import type { GameState } from './game.ts';

export const DEAL_NAME_MAX_LENGTH = 40;

export function isDealName(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length <= DEAL_NAME_MAX_LENGTH && !/[\r\n]/u.test(value)
  );
}

export function renameGame(state: GameState, name: string): GameState {
  return isDealName(name) && name !== state.name ? { ...state, name } : state;
}
