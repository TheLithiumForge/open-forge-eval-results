import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { checkNames, isPlayerCount, matchSizes } from './rules.ts';
import type { Match, Result, Tournament } from './rules.ts';

export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_VERSION = 1;
const TOURNAMENT_MAX_BYTES = 65_536;

// The fields of each format object, with the shape of the objects inside its list fields.
interface Shape {
  readonly [field: string]: Shape | null;
}
const RESULT: Shape = { elapsedMs: null, moves: null };
const MATCH: Shape = { boardCode: null, results: RESULT };
const RECORD: Shape = { matches: MATCH, players: null };
const EXPORT: Shape = { format: null, matches: MATCH, players: null, version: null };

type Decoded = { readonly tournament: Tournament } | { readonly unknownField: string } | null;

// Keys follow alphabetical order at every level. Elapsed time keeps the exact milliseconds the
// result was compared with, so a loaded tournament decides every match the same way.
export function tournamentRecord(tournament: Tournament) {
  return {
    matches: tournament.matches.map((match) => ({
      boardCode: match.boardCode,
      results: match.results.map((result) => ({
        elapsedMs: result.elapsedMs,
        moves: result.moves,
      })),
    })),
    players: [...tournament.players],
  };
}

export function encodeTournament(tournament: Tournament): string {
  return JSON.stringify(
    { format: TOURNAMENT_FORMAT, ...tournamentRecord(tournament), version: TOURNAMENT_VERSION },
    null,
    2,
  );
}

function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function readResult(value: unknown, size: number): Result | null {
  if (!isJsonObject(value) || !hasExactKeys(value, Object.keys(RESULT))) return null;
  const { moves, elapsedMs } = value;
  if (!isNonnegativeSafeInteger(moves) || moves > MOVES_MAX || moves < size ** 2 / 2) return null;
  if (typeof elapsedMs !== 'number' || !(elapsedMs >= 0 && elapsedMs <= ELAPSED_MAX_MS))
    return null;
  return { moves, elapsedMs };
}

function readMatch(value: unknown, size: number | undefined): Match | null {
  if (!isJsonObject(value) || !hasExactKeys(value, Object.keys(MATCH))) return null;
  const { boardCode, results } = value;
  if (size === undefined || typeof boardCode !== 'string') return null;
  if (parseBoardCode(boardCode)?.size !== size) return null;
  if (!Array.isArray(results) || results.length > 2) return null;
  const read = results.map((result: unknown) => readResult(result, size));
  return read.every((result): result is Result => result !== null)
    ? { boardCode, results: read }
    : null;
}

// Reads a whole tournament, or null. A stored record has no format or version fields.
export function readTournament(value: unknown, shape: Shape = RECORD): Tournament | null {
  if (!isJsonObject(value) || !hasExactKeys(value, Object.keys(shape))) return null;
  const { players, matches } = value;
  if (!isStringList(players) || !isPlayerCount(players.length) || !Array.isArray(matches))
    return null;
  const named = checkNames(players);
  const sizes = matchSizes(players.length);
  if ('notice' in named || matches.length !== sizes.length) return null;
  const read = matches.map((match: unknown, index) => readMatch(match, sizes[index]));
  const accepted = read.filter((match) => match !== null);
  if (accepted.length !== read.length) return null;
  if (new Set(accepted.map((match) => match.boardCode)).size !== accepted.length) return null;
  // Matches are played in bracket order, so nothing after the open match has a result.
  const open = accepted.findIndex((match) => match.results.length < 2);
  if (open >= 0 && accepted.slice(open + 1).some((match) => match.results.length > 0)) return null;
  return { players: named.names, matches: accepted };
}

// Finds the first field the format doesn't define, in the order the text gives them.
function unknownField(value: Readonly<Record<string, unknown>>, shape: Shape): string | null {
  for (const [field, child] of Object.entries(value)) {
    if (!Object.hasOwn(shape, field)) return field;
    const inner = shape[field];
    if (!inner || !Array.isArray(child)) continue;
    for (const item of child) {
      const found = isJsonObject(item) ? unknownField(item, inner) : null;
      if (found !== null) return found;
    }
  }
  return null;
}

export function decodeTournament(text: string): Decoded {
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return null;
  const value = parseJson(text);
  if (!isJsonObject(value)) return null;
  if (value.format !== TOURNAMENT_FORMAT || value.version !== TOURNAMENT_VERSION) return null;
  const field = unknownField(value, EXPORT);
  if (field !== null) return { unknownField: field };
  const tournament = readTournament(value, EXPORT);
  return tournament ? { tournament } : null;
}
