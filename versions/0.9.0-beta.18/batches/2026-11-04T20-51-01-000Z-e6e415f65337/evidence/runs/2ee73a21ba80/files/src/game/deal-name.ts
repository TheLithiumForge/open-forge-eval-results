import type { GameState } from './game.ts';

export const DEAL_NAME_MAX_UNITS = 40;

const LINE_BREAKS = /[\r\n]/g;

// A name is nonempty, at most 40 UTF-16 code units long and has no line breaks.
export function isDealName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= DEAL_NAME_MAX_UNITS &&
    !value.includes('\r') &&
    !value.includes('\n')
  );
}

// Typing or pasting keeps every other character, including surrounding spaces.
export function cleanDealName(draft: string): string {
  return draft.replace(LINE_BREAKS, '').slice(0, DEAL_NAME_MAX_UNITS);
}

// An empty name makes the game unnamed, so the field is absent instead of empty.
export function withDealName(state: GameState, name: string): GameState {
  const { name: previous, ...unnamed } = state;
  if (previous === undefined && name === '') return state;
  return name === '' ? unnamed : { ...unnamed, name };
}
