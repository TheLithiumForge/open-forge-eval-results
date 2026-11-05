import { isJsonObject } from '../saved-format.ts';
import { SNAPSHOT_KEYS } from '../snapshot.ts';

function unknownKey(value: unknown, keys: readonly string[]): string | null {
  return isJsonObject(value)
    ? (Object.keys(value).find((key) => !keys.includes(key)) ?? null)
    : null;
}

export function unknownTournamentField(value: unknown): string | null {
  let field = unknownKey(value, ['format', 'tournament', 'version']);
  if (field !== null || !isJsonObject(value) || !isJsonObject(value.tournament)) return field;
  const state = value.tournament;
  field = unknownKey(state, ['currentMatch', 'game', 'matches', 'phase', 'players']);
  if (field !== null) return field;
  if (Array.isArray(state.matches)) {
    for (const match of state.matches) {
      field = unknownKey(match, ['boardCode', 'results']);
      if (field !== null) return field;
      if (isJsonObject(match) && Array.isArray(match.results))
        for (const result of match.results) {
          field = unknownKey(result, ['elapsedMs', 'moves']);
          if (field !== null) return field;
        }
    }
  }
  field = unknownKey(state.game, SNAPSHOT_KEYS);
  if (field !== null || !isJsonObject(state.game) || !isJsonObject(state.game.selection))
    return field;
  const selection = state.game.selection;
  const keys =
    selection.kind === 'closed'
      ? ['kind']
      : selection.kind === 'one'
        ? ['kind', 'index']
        : ['kind', 'first', 'second', 'remainingMs'];
  return unknownKey(selection, keys);
}
