import { activateCard, advanceGame, createGame } from './state.ts';
import type { GameState } from './state.ts';
import { exactKeys, isInteger, isRecord } from './snapshotValidation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTES = 1048576;
export const REPLAY_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > REPLAY_BYTES) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])
      || value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string'
      || !Array.isArray(value.actions) || value.actions.length > REPLAY_ACTIONS || !isInteger(value.endMs)) return null;
    let state = createGame(value.boardCode);
    if (!state) return null;
    let time = 0;
    for (const action of value.actions) {
      if (!isRecord(action) || !exactKeys(action, ['atMs', 'index']) || !isInteger(action.atMs)
        || action.atMs < time || !isInteger(action.index, state.board.deck.length - 1)) return null;
      state = activateCard(advanceGame(state, action.atMs - time), action.index);
      time = action.atMs;
    }
    return value.endMs < time ? null : advanceGame(state, value.endMs - time);
  } catch { return null; }
}
