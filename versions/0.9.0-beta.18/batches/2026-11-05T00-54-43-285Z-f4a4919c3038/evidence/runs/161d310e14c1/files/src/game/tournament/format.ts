import { isJsonObject, hasExactKeys, isWithinBytes, parseJson } from '../saved-format.ts';
import { tournamentGameValue } from './format-game.ts';
import { unknownTournamentField } from './format-fields.ts';
import { readTournamentState } from './validation.ts';
import type { TournamentState } from './model.ts';

const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;

export function encodeTournament(state: TournamentState): string {
  return JSON.stringify(
    {
      format: TOURNAMENT_FORMAT,
      state: { ...state, game: tournamentGameValue(state.game) },
      version: TOURNAMENT_VERSION,
    },
    (_key, value: unknown) =>
      isJsonObject(value)
        ? Object.fromEntries(
            Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
          )
        : value,
    2,
  );
}

export function decodeTournament(text: string): { state: TournamentState } | { error: string } {
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  const field = unknownTournamentField(value);
  if (field) return { error: `Unknown field: ${field}.` };
  const state =
    isJsonObject(value) &&
    hasExactKeys(value, ['format', 'state', 'version']) &&
    value.format === TOURNAMENT_FORMAT &&
    value.version === TOURNAMENT_VERSION
      ? readTournamentState(value.state)
      : null;
  return state ? { state } : { error: 'Invalid tournament.' };
}
