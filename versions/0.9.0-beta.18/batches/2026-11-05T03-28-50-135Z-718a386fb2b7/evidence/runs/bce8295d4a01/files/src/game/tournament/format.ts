import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { validateTournamentState } from './validate-state.ts';
import type { TournamentState } from './types.ts';

const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
const TOURNAMENT_VERSION = 1;
const TOURNAMENT_TEXT_MAX_BYTES = 65_536;

type TournamentDecode =
  | { readonly ok: true; readonly tournament: TournamentState }
  | { readonly ok: false; readonly message: string };

export function encodeTournament(tournament: TournamentState, currentGame: string | null): string {
  const data = { ...tournament, currentGame };
  const validation = validateTournamentState(data);
  if (!('state' in validation)) throw new Error('Cannot export an invalid tournament.');
  return JSON.stringify(
    sortKeys({ format: TOURNAMENT_FORMAT, tournament: data, version: TOURNAMENT_VERSION }),
    null,
    2,
  );
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => [key, sortKeys(entry)]),
  );
}

export function decodeTournament(text: string): TournamentDecode {
  if (text.length > TOURNAMENT_TEXT_MAX_BYTES || !isWithinBytes(text, TOURNAMENT_TEXT_MAX_BYTES))
    return { ok: false, message: 'Invalid tournament.' };
  const value = parseJson(text);
  try {
    const envelope = objectWithKeys(value, ['format', 'tournament', 'version']);
    if (!envelope) return { ok: false, message: 'Invalid tournament.' };
    if (envelope.format !== TOURNAMENT_FORMAT || envelope.version !== TOURNAMENT_VERSION)
      return { ok: false, message: 'Invalid tournament.' };
    const result = validateTournamentState(envelope.tournament);
    return 'state' in result
      ? { ok: true, tournament: result.state }
      : { ok: false, message: result.message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Invalid tournament.' };
  }
}

function objectWithKeys(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!isJsonObject(value)) return null;
  const record = value;
  const unknown = Object.keys(record).find((key) => !keys.includes(key));
  if (unknown) throw new Error(`Unknown field: ${unknown}.`);
  return hasExactKeys(record, keys) ? record : null;
}
