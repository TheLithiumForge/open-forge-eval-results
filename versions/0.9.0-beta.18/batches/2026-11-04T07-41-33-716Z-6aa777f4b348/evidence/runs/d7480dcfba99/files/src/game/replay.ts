import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { exact, integer, object } from './snapshotValidation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > REPLAY_BYTE_LIMIT) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!object(value) || !exact(value, ['version', 'boardCode', 'actions', 'endMs']) ||
        value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
        !Array.isArray(value.actions) || value.actions.length > REPLAY_ACTION_LIMIT || !integer(value.endMs)) return null;
    let state = createGame(value.boardCode);
    if (!state) return null;
    let previous = 0;
    const actions: unknown[] = value.actions;
    for (const action of actions) {
      if (!object(action) || !exact(action, ['atMs', 'index']) || !integer(action.atMs) ||
          action.atMs < previous || !integer(action.index, state.board.deck.length - 1)) return null;
      state = activateCard(advanceGame(state, action.atMs - previous), action.index);
      previous = action.atMs;
    }
    if (value.endMs < previous) return null;
    return advanceGame(state, value.endMs - previous);
  } catch { return null; }
}
