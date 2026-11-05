import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import {
  acceptedName,
  nameProblem,
  nextPairs,
  PLAYER_COUNTS,
  roundBoardSize,
  roundNames,
} from './rules.ts';
import type { Attempt, Match, Tournament } from './rules.ts';

export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_VERSION = 1;
const TOURNAMENT_MAX_BYTES = 65_536;
// Every level lists its fields in alphabetical order, as the export writes them.
const ROOT_KEYS = ['format', 'players', 'rounds', 'version'] as const;
export const DATA_KEYS = ['players', 'rounds'] as const;
const MATCH_KEYS = ['boardCode', 'players', 'results'] as const;
const ATTEMPT_KEYS = ['elapsedMs', 'moves'] as const;

export const TournamentLoad = {
  invalid: 'Invalid tournament.',
  loaded: 'Loaded tournament.',
} as const;

// The players and rounds of a tournament in JSON form, with names in place of entry positions.
// Active time keeps its fractions, so a reloaded match compares exactly as it was played.
export function tournamentData(tournament: Tournament) {
  return {
    players: tournament.players,
    rounds: tournament.rounds.map((matches) =>
      matches.map((match) => ({
        boardCode: match.boardCode,
        players: match.players.map((player) => tournament.players[player] ?? ''),
        results: match.results.map((attempt) =>
          attempt ? { elapsedMs: attempt.elapsedMs, moves: attempt.moves } : null,
        ),
      })),
    ),
  };
}

export function encodeTournament(tournament: Tournament): string {
  const { players, rounds } = tournamentData(tournament);
  const value = { format: TOURNAMENT_FORMAT, players, rounds, version: TOURNAMENT_VERSION };
  return JSON.stringify(value, null, 2);
}

function readPlayers(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || !PLAYER_COUNTS.some((count) => count === value.length)) return null;
  const names: string[] = [];
  for (const name of value) {
    if (typeof name !== 'string' || acceptedName(name) !== name) return null;
    names.push(name);
  }
  return nameProblem(names) === null ? names : null;
}

// An attempt, null for a turn not played yet, or false when the value can't be either.
function readAttempt(value: unknown, size: number): Attempt | null | false {
  if (value === null) return null;
  if (!isJsonObject(value) || !hasExactKeys(value, ATTEMPT_KEYS)) return false;
  const { elapsedMs, moves } = value;
  if (!isNonnegativeSafeInteger(moves) || moves < size ** 2 / 2 || moves > MOVES_MAX) return false;
  if (typeof elapsedMs !== 'number' || !(elapsedMs >= 0 && elapsedMs <= ELAPSED_MAX_MS))
    return false;
  return { elapsedMs, moves };
}

function readMatch(
  value: unknown,
  players: Match['players'],
  names: readonly string[],
  size: number,
) {
  if (!isJsonObject(value) || !hasExactKeys(value, MATCH_KEYS)) return null;
  const { boardCode, results } = value;
  if (typeof boardCode !== 'string' || parseBoardCode(boardCode)?.size !== size) return null;
  const expected = players.map((player) => names[player]);
  if (!Array.isArray(value.players) || value.players.length !== 2) return null;
  if (value.players.some((name, index) => name !== expected[index])) return null;
  if (!Array.isArray(results) || results.length !== 2) return null;
  const first = readAttempt(results[0], size);
  const second = readAttempt(results[1], size);
  if (first === false || second === false || (!first && second)) return null;
  const match: Match = { boardCode, players, results: [first, second] };
  return match;
}

// Rebuilds the tournament round by round, so each match must hold the players the bracket gives it.
// Turns are played in order: nothing follows an unplayed turn.
export function readTournament(value: Record<string, unknown>): Tournament | null {
  const players = readPlayers(value.players);
  if (!players || !Array.isArray(value.rounds)) return null;
  const names = roundNames(players.length);
  let tournament: Tournament = { players, rounds: [] };
  let open = false;
  for (const [index, round] of value.rounds.entries()) {
    const pairs = nextPairs(tournament);
    const name = names[index];
    if (!pairs || !name || !Array.isArray(round) || round.length !== pairs.length) return null;
    const matches: Match[] = [];
    for (const [position, pair] of pairs.entries()) {
      const match = readMatch(round[position], pair, players, roundBoardSize(name));
      if (!match || (open && match.results[0])) return null;
      open ||= !match.results[1];
      matches.push(match);
    }
    tournament = { players, rounds: [...tournament.rounds, matches] };
  }
  const codes = tournament.rounds.flat().map((match) => match.boardCode);
  if (new Set(codes).size !== codes.length) return null;
  // A tournament starts with its opening round, and a finished round leads straight into the next.
  return !tournament.rounds.length || nextPairs(tournament) ? null : tournament;
}

function extraKey(value: Record<string, unknown>, keys: readonly string[]): string | undefined {
  return Object.keys(value).find((key) => !keys.includes(key));
}

// The first field, in document order, that the format doesn't define.
function unknownField(root: Record<string, unknown>): string | undefined {
  for (const key of Object.keys(root)) {
    if (!ROOT_KEYS.some((known) => known === key)) return key;
    if (key !== 'rounds' || !Array.isArray(root.rounds)) continue;
    for (const match of root.rounds.flat()) {
      if (!isJsonObject(match)) continue;
      for (const field of Object.keys(match)) {
        if (!MATCH_KEYS.some((known) => known === field)) return field;
        if (field !== 'results' || !Array.isArray(match.results)) continue;
        for (const attempt of match.results) {
          const extra = isJsonObject(attempt) ? extraKey(attempt, ATTEMPT_KEYS) : undefined;
          if (extra !== undefined) return extra;
        }
      }
    }
  }
  return undefined;
}

// A valid tournament, or the notice that explains why the text was refused.
export function decodeTournament(text: string): Tournament | string {
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    value.format !== TOURNAMENT_FORMAT ||
    value.version !== TOURNAMENT_VERSION
  )
    return TournamentLoad.invalid;
  const unknown = unknownField(value);
  if (unknown !== undefined) return `Unknown field: ${unknown}.`;
  if (!hasExactKeys(value, ROOT_KEYS)) return TournamentLoad.invalid;
  return readTournament(value) ?? TournamentLoad.invalid;
}
