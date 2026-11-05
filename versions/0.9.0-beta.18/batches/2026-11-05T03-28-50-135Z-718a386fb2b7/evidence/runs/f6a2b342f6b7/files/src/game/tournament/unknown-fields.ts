import { isJsonObject } from '../saved-format.ts';

export function findTournamentUnknownField(value: unknown): string | null {
  if (!isJsonObject(value)) return null;
  let field = unknown(value, ['format', 'tournament', 'version']);
  if (field) return field;
  const data = value.tournament;
  if (!isJsonObject(data)) return null;
  field = unknown(data, [
    'champion',
    'currentMatch',
    'currentTurn',
    'game',
    'matches',
    'playerCount',
    'players',
  ]);
  if (field) return field;
  for (const player of Array.isArray(data.players) ? data.players : []) {
    if (isJsonObject(player) && (field = unknown(player, ['name', 'seed']))) return field;
  }
  for (const match of Array.isArray(data.matches) ? data.matches : []) {
    if (!isJsonObject(match)) continue;
    field = unknown(match, ['boardCode', 'players', 'results', 'round', 'winner']);
    if (field) return field;
    for (const player of Array.isArray(match.players) ? match.players : []) {
      if (isJsonObject(player) && (field = unknown(player, ['name', 'seed']))) return field;
    }
    for (const result of Array.isArray(match.results) ? match.results : []) {
      if (isJsonObject(result) && (field = unknown(result, ['elapsedMs', 'moves']))) return field;
    }
    if (isJsonObject(match.winner) && (field = unknown(match.winner, ['name', 'seed'])))
      return field;
  }
  if (isJsonObject(data.champion) && (field = unknown(data.champion, ['name', 'seed'])))
    return field;
  return unknownGame(data.game);
}

function unknownGame(value: unknown): string | null {
  if (!isJsonObject(value)) return null;
  const field = unknown(value, [
    'boardCode',
    'elapsedMs',
    'matched',
    'moves',
    'selection',
    'started',
    'version',
  ]);
  if (field) return field;
  if (!isJsonObject(value.selection)) return null;
  const kind = value.selection.kind;
  const keys =
    kind === 'one'
      ? ['index', 'kind']
      : kind === 'mismatch'
        ? ['first', 'kind', 'remainingMs', 'second']
        : ['kind'];
  return unknown(value.selection, keys);
}

function unknown(value: Record<string, unknown>, keys: readonly string[]): string | null {
  return Object.keys(value).find((key) => !keys.includes(key)) ?? null;
}
