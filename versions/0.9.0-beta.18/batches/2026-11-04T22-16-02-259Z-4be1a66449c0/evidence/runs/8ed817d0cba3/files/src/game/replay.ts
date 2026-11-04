import { activateCard, advanceGame, createGame } from './game.ts';
import type { Game } from './game.ts';
import { integer, keys, object, parseJSON } from './validation.ts';
export function replayGame(text: string): Game | null {
  const data = parseJSON(text, 1048576);
  if (!object(data) || !keys(data, ['version', 'boardCode', 'actions', 'endMs']) || data.version !== 1 || typeof data.boardCode !== 'string' || !Array.isArray(data.actions) || data.actions.length > 10000 || !integer(data.endMs)) return null;
  let game = createGame(data.boardCode), previous = 0;
  if (!game) return null;
  for (const raw of data.actions as unknown[]) {
    if (!object(raw) || !keys(raw, ['atMs', 'index']) || !integer(raw.atMs) || raw.atMs < previous || !integer(raw.index, game.board.deck.length - 1)) return null;
    game = activateCard(advanceGame(game, raw.atMs - previous), raw.index);
    previous = raw.atMs;
  }
  if (data.endMs < previous) return null;
  return advanceGame(game, data.endMs - previous);
}
