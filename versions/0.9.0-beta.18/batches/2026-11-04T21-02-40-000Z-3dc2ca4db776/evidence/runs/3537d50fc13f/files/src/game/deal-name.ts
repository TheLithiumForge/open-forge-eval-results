import type { GameState } from './game.ts';

// A name counts UTF-16 code units, as the native input's maxLength does.
export const DEAL_NAME_MAX_LENGTH = 40;
const LINE_BREAK = /[\r\n]/;

// An empty name means an unnamed game. Every other character and surrounding space is kept.
export function isDealName(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length <= DEAL_NAME_MAX_LENGTH && !LINE_BREAK.test(value)
  );
}

export function renameGame(state: GameState, name: string): GameState {
  return isDealName(name) && name !== state.name ? { ...state, name } : state;
}
