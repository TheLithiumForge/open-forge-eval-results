import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { unknownTournamentField } from './format-fields.ts';
import { readTournamentState } from './read-state.ts';
import type { TournamentState } from './rules.ts';

export const TOURNAMENT_MAX_BYTES = 1_048_576;
const FORMAT = 'neon-pairs/tournament';
const VERSION = 1;

export function encodeTournament(state: TournamentState | null): string {
  const tournament = state
    ? {
        ...state,
        game: state.game ? parseJson(encodeSnapshot(state.game)) : null,
      }
    : null;
  return JSON.stringify(
    { format: FORMAT, tournament, version: VERSION },
    (_key, value: unknown) =>
      isJsonObject(value)
        ? Object.fromEntries(
            Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
          )
        : value,
    2,
  );
}

export function decodeTournament(
  text: string,
): { state: TournamentState | null; error?: never } | { error: string; state?: never } {
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return { error: 'Invalid tournament.' };
  const value = parseJson(text);
  const field = unknownTournamentField(value);
  if (field !== null) return { error: `Unknown field: ${field}.` };
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['format', 'tournament', 'version']) ||
    value.format !== FORMAT ||
    value.version !== VERSION
  )
    return { error: 'Invalid tournament.' };
  if (value.tournament === null) return { state: null };
  const state = readTournamentState(value.tournament);
  return state ? { state } : { error: 'Invalid tournament.' };
}
