import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard } from './activate.ts';
import { advanceGame } from './advance.ts';
import { exactKeys, integer, isRecord, parseJson } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTES = 1048576;
export const MAX_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseJson(text, REPLAY_BYTES);
  if (!isRecord(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !integer(value.endMs) || !Array.isArray(value.actions) || value.actions.length > MAX_ACTIONS) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let previousMs = 0;
  for (const item of value.actions) {
    const action: unknown = item;
    if (!isRecord(action) || !exactKeys(action, ['atMs', 'index']) ||
        !integer(action.atMs) || !integer(action.index, state.board.deck.length - 1) ||
        action.atMs < previousMs || action.atMs > value.endMs) return null;
    state = activateCard(advanceGame(state, action.atMs - previousMs), action.index);
    previousMs = action.atMs;
  }
  return advanceGame(state, value.endMs - previousMs);
}
