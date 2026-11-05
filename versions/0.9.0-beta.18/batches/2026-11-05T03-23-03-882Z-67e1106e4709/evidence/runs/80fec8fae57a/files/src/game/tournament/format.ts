import { encodeSnapshot } from '../snapshot.ts';
import { isJsonObject, hasExactKeys, parseJson, isWithinBytes } from '../saved-format.ts';
import { normalizeName } from './names.ts';
import { readTournament, unknownTournamentField } from './validation.ts';
import type { TournamentDocument } from './model.ts';

const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
const TOURNAMENT_VERSION = 1;
const TOURNAMENT_MAX_BYTES = 262_144;

// The replacer sorts every object, including the embedded version 1 snapshot.
function alphabetical(_key: string, value: unknown): unknown {
  if (!isJsonObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, value[key]]),
  );
}

export function encodeTournament(document: TournamentDocument): string {
  const tournament = document.tournament;
  return JSON.stringify(
    {
      format: TOURNAMENT_FORMAT,
      version: TOURNAMENT_VERSION,
      setup: document.setup?.map(normalizeName) ?? null,
      tournament: tournament
        ? { ...tournament, game: parseJson(encodeSnapshot(tournament.game)) }
        : null,
    },
    alphabetical,
    2,
  );
}

export function decodeTournament(text: string): {
  document: TournamentDocument | null;
  error: string;
} {
  const invalid = { document: null, error: 'Invalid tournament.' };
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return invalid;
  const value = parseJson(text);
  const field = unknownTournamentField(value);
  if (field !== null) return { document: null, error: `Unknown field: ${field}.` };
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['format', 'version', 'setup', 'tournament']) ||
    value.format !== TOURNAMENT_FORMAT ||
    value.version !== TOURNAMENT_VERSION
  )
    return invalid;
  if (value.tournament !== null) {
    const tournament = readTournament(value.tournament);
    return tournament && value.setup === null
      ? { document: { setup: null, tournament }, error: '' }
      : invalid;
  }
  if (!Array.isArray(value.setup) || (value.setup.length !== 4 && value.setup.length !== 8))
    return invalid;
  const setup: string[] = [];
  for (const name of value.setup) {
    if (typeof name !== 'string') return invalid;
    setup.push(normalizeName(name));
  }
  return { document: { setup, tournament: null }, error: '' };
}
