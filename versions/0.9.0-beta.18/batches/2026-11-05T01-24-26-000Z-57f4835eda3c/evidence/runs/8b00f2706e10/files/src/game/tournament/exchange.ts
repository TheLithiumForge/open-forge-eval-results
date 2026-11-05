import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { isValidTournament } from './rules.ts';
import type { Tournament, TournamentMatch, TournamentResult } from './rules.ts';

export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;
export const TournamentNotice = { invalid: 'Invalid tournament.' } as const;

// Each object lists its fields. A nested shape also applies to every element of a list.
interface Shape {
  readonly [field: string]: Shape | null;
}
const RESULT_SHAPE: Shape = { elapsedMs: null, moves: null };
const MATCH_SHAPE: Shape = { boardCode: null, results: RESULT_SHAPE };
const RECORD_SHAPE: Shape = { matches: MATCH_SHAPE, players: null };
const EXPORT_SHAPE: Shape = { format: null, ...RECORD_SHAPE, version: null };

type TournamentImport = { tournament: Tournament } | { problem: string };

// The data both exports and saved records hold, with keys in alphabetical order.
export function tournamentRecord({ matches, players }: Tournament) {
  return {
    matches: matches.map(({ boardCode, results }) => ({
      boardCode,
      results: results.map((result) =>
        result ? { elapsedMs: result.elapsedMs, moves: result.moves } : null,
      ),
    })),
    players,
  };
}

// Results keep the game's exact active milliseconds, so a loaded tournament compares the same way.
export function encodeTournament(tournament: Tournament): string {
  const { matches, players } = tournamentRecord(tournament);
  const value = { format: TOURNAMENT_FORMAT, matches, players, version: TOURNAMENT_VERSION };
  return JSON.stringify(value, null, 2);
}

// Finds the first field, in reading order, that the shape doesn't define.
function unknownField(value: unknown, shape: Shape): string | null {
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    if (!isJsonObject(item)) continue;
    for (const [field, child] of Object.entries(item)) {
      if (!Object.hasOwn(shape, field)) return field;
      const inner = shape[field];
      const found = inner ? unknownField(child, inner) : null;
      if (found !== null) return found;
    }
  }
  return null;
}

function readResult(value: unknown): TournamentResult | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !hasExactKeys(value, Object.keys(RESULT_SHAPE))) return undefined;
  const { elapsedMs, moves } = value;
  if (typeof elapsedMs !== 'number' || !isNonnegativeSafeInteger(moves)) return undefined;
  return { elapsedMs, moves };
}

function readMatch(value: unknown): TournamentMatch | null {
  if (!isJsonObject(value) || !hasExactKeys(value, Object.keys(MATCH_SHAPE))) return null;
  const { boardCode, results } = value;
  if (typeof boardCode !== 'string' || !Array.isArray(results)) return null;
  const read = results.map(readResult);
  const valid = read.filter((result) => result !== undefined);
  return valid.length === read.length ? { boardCode, results: valid } : null;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

// Reads the record data shared by exports and saved records. Unusable data gives null.
export function readTournament(value: unknown): Tournament | null {
  if (!isJsonObject(value) || !hasExactKeys(value, Object.keys(RECORD_SHAPE))) return null;
  const { matches, players } = value;
  if (!isStringList(players) || !Array.isArray(matches)) return null;
  const read = matches.map(readMatch);
  const valid = read.filter((match) => match !== null);
  if (valid.length !== read.length) return null;
  const tournament = { players, matches: valid };
  return isValidTournament(tournament) ? tournament : null;
}

export function decodeTournament(text: string): TournamentImport {
  const invalid = { problem: TournamentNotice.invalid };
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return invalid;
  const value = parseJson(text);
  if (!isJsonObject(value)) return invalid;
  const field = unknownField(value, EXPORT_SHAPE);
  if (field !== null) return { problem: `Unknown field: ${field}.` };
  const { format, version, matches, players } = value;
  if (format !== TOURNAMENT_FORMAT || version !== TOURNAMENT_VERSION) return invalid;
  if (!hasExactKeys(value, Object.keys(EXPORT_SHAPE))) return invalid;
  const tournament = readTournament({ matches, players });
  return tournament ? { tournament } : invalid;
}
