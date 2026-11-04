import { activateCard, advanceGame, createGame } from './game.ts';
import type { GameState } from './game.ts';
import { parseBoardCode } from './boardCode.ts';
import { integer, keys, object, parseJson } from './validation.ts';
export function replayGame(text: string): GameState | null {
  const data = parseJson(text, 1048576);
  if (!object(data) || !keys(data, ['version', 'boardCode', 'actions', 'endMs']) || data.version !== 1 || typeof data.boardCode !== 'string' || !parseBoardCode(data.boardCode) || !Array.isArray(data.actions) || data.actions.length > 10000 || !integer(data.endMs, Number.MAX_SAFE_INTEGER)) return null;
  let state = createGame(data.boardCode); let previous = 0;
  for (const action of data.actions) {
    if (!object(action) || !keys(action, ['atMs', 'index']) || !integer(action.atMs, Number.MAX_SAFE_INTEGER) || action.atMs < previous || !integer(action.index, state.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - previous), action.index); previous = action.atMs;
  }
  return data.endMs < previous ? null : advanceGame(state, data.endMs - previous);
}
