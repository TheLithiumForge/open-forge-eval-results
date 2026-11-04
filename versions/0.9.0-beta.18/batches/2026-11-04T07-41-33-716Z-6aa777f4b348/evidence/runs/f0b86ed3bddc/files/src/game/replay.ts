import { parseBoardCode } from './boardCode.ts';
import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { exactKeys, integerIn, isObject, parseJson } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export function replayGame(text: string): GameState | null {
  const data = parseJson(text, REPLAY_BYTE_LIMIT);
  if (!isObject(data) || !exactKeys(data, ['version', 'boardCode', 'actions', 'endMs']) ||
      data.version !== REPLAY_VERSION || typeof data.boardCode !== 'string' ||
      !parseBoardCode(data.boardCode) || !Array.isArray(data.actions) ||
      data.actions.length > REPLAY_ACTION_LIMIT || !integerIn(data.endMs, 0, Number.MAX_SAFE_INTEGER)) return null;
  let state = createGame(data.boardCode);
  let time = 0;
  for (const action of data.actions) {
    if (!isObject(action) || !exactKeys(action, ['atMs', 'index']) ||
        !integerIn(action.atMs, time, data.endMs) || !integerIn(action.index, 0, state.board.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - time), action.index);
    time = action.atMs;
  }
  return advanceGame(state, data.endMs - time);
}
