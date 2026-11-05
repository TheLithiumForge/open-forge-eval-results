import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { isNameGroup } from './names.ts';
import { isFinished, isPlayerCount, matchSizes, playedGames } from './rules.ts';
import type { Match, Result, Tournament } from './rules.ts';

export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;

// Keys at each level, in the alphabetical order that export writes.
interface Shape {
  readonly keys: readonly string[];
  readonly lists?: Readonly<Record<string, Shape>>;
}
const RESULT: Shape = { keys: ['elapsedMs', 'moves'] };
const MATCH: Shape = { keys: ['boardCode', 'results'], lists: { results: RESULT } };
const ROOT: Shape = {
  keys: ['format', 'matches', 'players', 'reviewing', 'version'],
  lists: { matches: MATCH },
};

type TournamentImport =
  { readonly tournament: Tournament } | { readonly unknownField: string } | null;

export function matchesJson(tournament: Tournament) {
  return tournament.matches.map((match) => ({
    boardCode: match.boardCode,
    results: match.results.map((result) => result && resultJson(result)),
  }));
}

function resultJson(result: Result) {
  return { elapsedMs: result.elapsedMs, moves: result.moves };
}

// Elapsed time keeps its fractions, so a tie on time is judged the same way after a load.
export function encodeTournament(tournament: Tournament): string {
  return JSON.stringify(
    {
      format: TOURNAMENT_FORMAT,
      matches: matchesJson(tournament),
      players: tournament.players,
      reviewing: tournament.reviewing,
      version: TOURNAMENT_VERSION,
    },
    null,
    2,
  );
}

export function decodeTournament(text: string): TournamentImport {
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return null;
  const value = parseJson(text);
  if (!isJsonObject(value)) return null;
  const unknownField = firstUnknownField(value, ROOT);
  if (unknownField !== null) return { unknownField };
  if (
    !hasExactKeys(value, ROOT.keys) ||
    value.format !== TOURNAMENT_FORMAT ||
    value.version !== TOURNAMENT_VERSION ||
    typeof value.reviewing !== 'boolean'
  )
    return null;
  const tournament = readBracket(value.players, value.matches, value.reviewing);
  return tournament && { tournament };
}

// The first field outside the format, in document order, looking inside matches and results.
function firstUnknownField(value: unknown, shape: Shape): string | null {
  if (!isJsonObject(value)) return null;
  for (const [key, child] of Object.entries(value)) {
    if (!shape.keys.includes(key)) return key;
    const item = shape.lists?.[key];
    if (!item || !Array.isArray(child)) continue;
    for (const entry of child) {
      const found = firstUnknownField(entry, item);
      if (found !== null) return found;
    }
  }
  return null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// No players describes a tournament that hasn't started. Otherwise every match has its stage's
// board size and a deal of its own, and results fill in play order.
export function readBracket(
  players: unknown,
  matches: unknown,
  reviewing: boolean,
): Tournament | null {
  if (!Array.isArray(players) || !players.every(isString) || !Array.isArray(matches)) return null;
  if (players.length > 0 && (!isPlayerCount(players.length) || !isNameGroup(players))) return null;
  const sizes = matchSizes(players.length);
  if (matches.length !== sizes.length) return null;
  const read: Match[] = [];
  for (const [index, match] of matches.entries()) {
    const accepted = readMatch(match, sizes[index] ?? 0);
    if (!accepted) return null;
    read.push(accepted);
  }
  if (new Set(read.map((match) => match.boardCode)).size !== read.length) return null;
  const tournament: Tournament = { players, matches: read, reviewing };
  const played = playedGames(tournament);
  const results = read.flatMap((match) => match.results);
  if (results.some((result, index) => (result !== null) !== index < played)) return null;
  if (reviewing && (played === 0 || isFinished(tournament))) return null;
  return tournament;
}

function readMatch(value: unknown, size: number): Match | null {
  if (!isJsonObject(value) || !hasExactKeys(value, MATCH.keys)) return null;
  const { boardCode, results } = value;
  if (typeof boardCode !== 'string' || parseBoardCode(boardCode)?.size !== size) return null;
  if (!Array.isArray(results) || results.length !== 2) return null;
  const first = readResult(results[0], size);
  const second = readResult(results[1], size);
  if (first === undefined || second === undefined) return null;
  return { boardCode, results: [first, second] };
}

// Null is an unplayed game, and undefined rejects the value.
function readResult(value: unknown, size: number): Result | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !hasExactKeys(value, RESULT.keys)) return undefined;
  const { moves, elapsedMs } = value;
  if (!isNonnegativeSafeInteger(moves) || moves < size ** 2 / 2 || moves > MOVES_MAX)
    return undefined;
  if (typeof elapsedMs !== 'number' || !(elapsedMs >= 0 && elapsedMs <= ELAPSED_MAX_MS))
    return undefined;
  return { moves, elapsedMs };
}
