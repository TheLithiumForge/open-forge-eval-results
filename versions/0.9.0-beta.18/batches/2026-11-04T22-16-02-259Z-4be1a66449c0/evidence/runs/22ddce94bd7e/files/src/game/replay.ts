import { activateCard, advanceGame, createGame } from './state.ts';
import type { GameState } from './state.ts';
import { integer, keys, object, parseJson } from './validation.ts';
export function replayGame(text: string): GameState | null {
  const data = parseJson(text, 1048576);
  if (!object(data) || !keys(data, ['version', 'boardCode', 'actions', 'endMs']) || data.version !== 1 || typeof data.boardCode !== 'string' || !Array.isArray(data.actions) || data.actions.length > 10000 || !integer(data.endMs)) return null;
  let state = createGame(data.boardCode), time = 0;
  if (!state) return null;
  for (const action of data.actions) {
    if (!object(action) || !keys(action, ['atMs', 'index']) || !integer(action.atMs) || action.atMs < time || !integer(action.index, state.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - time), action.index);
    time = action.atMs;
  }
  return data.endMs < time ? null : advanceGame(state, data.endMs - time);
}
