import { encodeSnapshot } from '../snapshot.ts';
import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { readTournamentSetup, readTournamentState } from './validation.ts';
import type { TournamentDocument } from './model.ts';

export const TOURNAMENT_MAX_BYTES = 262_144;
const FORMAT = 'neon-pairs/tournament';

// Key order is canonical for this format, including the embedded game snapshot.
function alphabetical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(alphabetical);
  if (!isJsonObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, alphabetical(value[key])]),
  );
}

export function encodeTournament(document: TournamentDocument): string {
  const tournament = document.tournament;
  const data = tournament
    ? { ...tournament, game: parseJson(encodeSnapshot(tournament.game)) }
    : null;
  return JSON.stringify(
    alphabetical({ format: FORMAT, version: 1, setup: document.setup, tournament: data }),
    null,
    2,
  );
}

function unknownField(value: unknown, keys: readonly string[]): string | null {
  if (!isJsonObject(value)) return null;
  return Object.keys(value).find((key) => !keys.includes(key)) ?? null;
}

function firstUnknownField(value: Record<string, unknown>): string | null {
  let field =
    unknownField(value, ['format', 'version', 'setup', 'tournament']) ??
    unknownField(value.setup, ['count', 'names']) ??
    unknownField(value.tournament, ['names', 'matches', 'currentMatch', 'phase', 'game']);
  if (field || !isJsonObject(value.tournament)) return field;
  const tournament = value.tournament;
  field = unknownField(tournament.game, [
    'version',
    'boardCode',
    'matched',
    'selection',
    'moves',
    'elapsedMs',
    'started',
  ]);
  if (field) return field;
  if (isJsonObject(tournament.game) && isJsonObject(tournament.game.selection)) {
    const selection = tournament.game.selection;
    const keys =
      selection.kind === 'closed'
        ? ['kind']
        : selection.kind === 'one'
          ? ['kind', 'index']
          : ['kind', 'first', 'second', 'remainingMs'];
    field = unknownField(selection, keys);
    if (field) return field;
  }
  if (Array.isArray(tournament.matches))
    for (const match of tournament.matches) {
      field = unknownField(match, ['boardCode', 'players', 'results', 'winner']);
      if (field) return field;
      if (isJsonObject(match) && Array.isArray(match.results))
        for (const result of match.results) {
          field = unknownField(result, ['moves', 'elapsedMs']);
          if (field) return field;
        }
    }
  return null;
}

export function readTournamentDocument(text: string): {
  document: TournamentDocument | null;
  error: string;
} {
  const invalid = { document: null, error: 'Invalid tournament.' };
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return invalid;
  const value = parseJson(text);
  if (!isJsonObject(value)) return invalid;
  const field = firstUnknownField(value);
  if (field !== null) return { document: null, error: `Unknown field: ${field}.` };
  if (
    !hasExactKeys(value, ['format', 'version', 'setup', 'tournament']) ||
    value.format !== FORMAT ||
    value.version !== 1
  )
    return invalid;
  if (value.tournament === null) {
    const setup = readTournamentSetup(value.setup);
    return setup ? { document: { setup, tournament: null }, error: '' } : invalid;
  }
  if (value.setup !== null) return invalid;
  const tournament = readTournamentState(value.tournament);
  return tournament ? { document: { setup: null, tournament }, error: '' } : invalid;
}
