import { activateCard, advanceGame, createGame } from './game.ts';
import type { Game } from './game.ts';
import { json, keys, natural, object } from './validation.ts';
export function replayGame(text: string): Game | null {
  const data = json(text, 1048576);
  if (!object(data) || !keys(data, ['version', 'boardCode', 'actions', 'endMs']) || data.version !== 1 || typeof data.boardCode !== 'string' || !Array.isArray(data.actions) || data.actions.length > 10000 || !natural(data.endMs)) return null;
  let game = createGame(data.boardCode);
  if (!game) return null;
  let at = 0;
  for (const action of data.actions) {
    if (!object(action) || !keys(action, ['atMs', 'index']) || !natural(action.atMs) || action.atMs < at || !natural(action.index) || action.index >= game.deck.length || action.atMs > data.endMs) return null;
    game = activateCard(advanceGame(game, action.atMs - at), action.index);
    at = action.atMs;
  }
  return advanceGame(game, data.endMs - at);
}
