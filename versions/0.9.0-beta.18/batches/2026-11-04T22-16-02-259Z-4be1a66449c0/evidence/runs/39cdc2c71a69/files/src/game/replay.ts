import { activateCard, advanceGame, createGame } from './game.ts';
import type { Game } from './game.ts';
import { parseBoardCode } from './deck.ts';
import { integer, keys, object, parseJSON } from './validation.ts';
export function replayGame(text: string): Game | null {
  const data = parseJSON(text, 1048576);
  if (!object(data) || !keys(data, ['version','boardCode','actions','endMs']) || data.version !== 1 || typeof data.boardCode !== 'string' || !parseBoardCode(data.boardCode) || !Array.isArray(data.actions) || data.actions.length > 10000 || !integer(data.endMs)) return null;
  let game = createGame(data.boardCode), time = 0;
  for (const action of data.actions as unknown[]) {
    if (!object(action) || !keys(action, ['atMs','index']) || !integer(action.atMs) || action.atMs < time || !integer(action.index, game.deck.length - 1) || action.atMs > data.endMs) return null;
    game = activateCard(advanceGame(game, action.atMs - time), action.index);
    time = action.atMs;
  }
  return advanceGame(game, data.endMs - time);
}
