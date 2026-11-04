import { activateCard, advanceGame, createGame } from './game';
import type { Game } from './game';
import { integer, keys, object, parseJSON } from './validation';
export function replayGame(text: string): Game | null {
  const data = parseJSON(text, 1048576);
  if (!object(data) || !keys(data, ['version','boardCode','actions','endMs']) || data.version !== 1 || typeof data.boardCode !== 'string' || !Array.isArray(data.actions) || data.actions.length > 10000 || !integer(data.endMs, 0, Number.MAX_SAFE_INTEGER)) return null;
  let game = createGame(data.boardCode);
  if (!game) return null;
  let time = 0;
  for (const action of data.actions) {
    if (!object(action) || !keys(action, ['atMs','index']) || !integer(action.atMs, time, Number.MAX_SAFE_INTEGER) || !integer(action.index, 0, game.board.deck.length - 1) || action.atMs > data.endMs) return null;
    game = activateCard(advanceGame(game, action.atMs - time), action.index);
    time = action.atMs;
  }
  return advanceGame(game, data.endMs - time);
}
