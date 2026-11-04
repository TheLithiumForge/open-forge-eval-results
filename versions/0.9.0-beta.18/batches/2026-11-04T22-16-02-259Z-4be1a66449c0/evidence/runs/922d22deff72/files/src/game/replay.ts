import { activateCard, advanceGame, createGame } from './state.ts';
import type { GameState } from './state.ts';
import { integer, keys, object, readJSON } from './validation.ts';
export function replayGame(text: string): GameState | null {
  const v = readJSON(text, 1048576);
  if (!object(v) || !keys(v, ['version','boardCode','actions','endMs']) || v.version !== 1 || typeof v.boardCode !== 'string' || !Array.isArray(v.actions) || v.actions.length > 10000 || !integer(v.endMs)) return null;
  let state = createGame(v.boardCode), time = 0;
  if (!state) return null;
  for (const action of v.actions) {
    if (!object(action) || !keys(action, ['atMs','index']) || !integer(action.atMs) || action.atMs < time || !integer(action.index, state.board.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - time), action.index); time = action.atMs;
  }
  if (v.endMs < time) return null;
  return advanceGame(state, v.endMs - time);
}
