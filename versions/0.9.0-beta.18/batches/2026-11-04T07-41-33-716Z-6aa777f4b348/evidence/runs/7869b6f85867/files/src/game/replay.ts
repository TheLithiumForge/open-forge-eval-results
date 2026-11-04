import { parseBoardCode } from './board-code.ts';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { exactKeys, integer, isObject, parseJson } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTES = 1048576;
export const MAX_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseJson(text, REPLAY_BYTES);
  if (!isObject(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])
    || value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string'
    || !parseBoardCode(value.boardCode) || !Array.isArray(value.actions)
    || value.actions.length > MAX_ACTIONS || !integer(value.endMs)) return null;
  let game = createGame(value.boardCode);
  let previousMs = 0;
  for (const action of value.actions) {
    if (!isObject(action) || !exactKeys(action, ['atMs', 'index'])
      || !integer(action.atMs) || action.atMs < previousMs || action.atMs > value.endMs
      || !integer(action.index, game.board.deck.length - 1)) return null;
    game = advanceGame(game, action.atMs - previousMs);
    game = activateCard(game, action.index);
    previousMs = action.atMs;
  }
  return advanceGame(game, value.endMs - previousMs);
}
