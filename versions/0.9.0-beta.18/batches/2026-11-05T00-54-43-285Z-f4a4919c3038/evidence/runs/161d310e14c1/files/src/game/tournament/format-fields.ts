import { isJsonObject } from '../saved-format.ts';
import { SNAPSHOT_KEYS } from '../snapshot.ts';

function extra(value: Record<string, unknown>, keys: readonly string[]): string | undefined {
  return Object.keys(value).find((key) => !keys.includes(key));
}

export function unknownTournamentField(value: unknown): string | undefined {
  if (!isJsonObject(value)) return undefined;
  const root = extra(value, ['format', 'state', 'version']);
  if (root) return root;
  const state = value.state;
  if (!isJsonObject(state)) return undefined;
  const stateField = extra(state, ['game', 'matches', 'names', 'phase']);
  if (stateField) return stateField;
  if (Array.isArray(state.matches)) {
    for (const match of state.matches) {
      if (!isJsonObject(match)) continue;
      const matchField = extra(match, ['boardCode', 'results']);
      if (matchField) return matchField;
      if (!Array.isArray(match.results)) continue;
      for (const result of match.results) {
        if (!isJsonObject(result)) continue;
        const resultField = extra(result, ['elapsedMs', 'moves']);
        if (resultField) return resultField;
      }
    }
  }
  if (!isJsonObject(state.game)) return undefined;
  const gameField = extra(state.game, SNAPSHOT_KEYS);
  if (gameField) return gameField;
  const selection = state.game.selection;
  if (!isJsonObject(selection)) return undefined;
  const keys =
    selection.kind === 'closed'
      ? ['kind']
      : selection.kind === 'one'
        ? ['index', 'kind']
        : ['first', 'kind', 'remainingMs', 'second'];
  return extra(selection, keys);
}
