import { isJsonObject } from '../saved-format.ts';
import { SNAPSHOT_KEYS } from '../snapshot.ts';

function extra(value: unknown, keys: readonly string[]): string | null {
  if (!isJsonObject(value)) return null;
  const key = Object.keys(value).find((key) => !keys.includes(key));
  return key === undefined ? null : `Unknown field: ${key}.`;
}

export function tournamentFieldError(value: unknown): string | null {
  const root = extra(value, ['format', 'game', 'tournament', 'version']);
  if (root || !isJsonObject(value)) return root;
  const game = value.game;
  const gameError = extra(game, SNAPSHOT_KEYS);
  if (gameError) return gameError;
  if (isJsonObject(game) && isJsonObject(game.selection)) {
    const keys =
      game.selection.kind === 'closed'
        ? ['kind']
        : game.selection.kind === 'one'
          ? ['kind', 'index']
          : ['kind', 'first', 'second', 'remainingMs'];
    const selectionError = extra(game.selection, keys);
    if (selectionError) return selectionError;
  }
  const tournament = value.tournament;
  const error = extra(tournament, ['players', 'matches', 'matchIndex', 'turn', 'phase']);
  if (error || !isJsonObject(tournament)) return error;
  if (!Array.isArray(tournament.matches)) return null;
  for (const match of tournament.matches) {
    const matchError = extra(match, ['round', 'size', 'boardCode', 'players', 'results', 'winner']);
    if (matchError) return matchError;
    if (!isJsonObject(match) || !Array.isArray(match.results)) continue;
    for (const result of match.results) {
      const resultError = extra(result, ['moves', 'elapsedMs']);
      if (resultError) return resultError;
    }
  }
  return null;
}
