import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { checkNames, normalizeName } from './names.ts';
import { boardSizeOf, hasStarted, isPlayerCount, matchCount, nextTurn } from './rules.ts';
import type { Match, Result, Tournament } from './rules.ts';

const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;
const TournamentNotice = { invalid: 'Invalid tournament.' } as const;

const ROOT_KEYS = ['format', 'matches', 'players', 'version'] as const;
const MATCH_KEYS = ['boardCode', 'results'] as const;
const RESULT_KEYS = ['elapsedMs', 'moves'] as const;

type TournamentDecoding =
  | { readonly ok: true; readonly tournament: Tournament }
  | { readonly ok: false; readonly notice: string };

// Keys are written in alphabetical order at every level. Derived values are not written, so the
// winners, rounds and champion always come from the recorded results.
export function encodeTournament(tournament: Tournament): string {
  return JSON.stringify(
    {
      format: TOURNAMENT_FORMAT,
      matches: tournament.matches.map((match) => ({
        boardCode: match.boardCode,
        results: match.results.map(({ elapsedMs, moves }) => ({ elapsedMs, moves })),
      })),
      players: tournament.players,
      version: TOURNAMENT_VERSION,
    },
    null,
    2,
  );
}

function unknownKey(value: unknown, keys: readonly string[]): string | null {
  return isJsonObject(value)
    ? (Object.keys(value).find((key) => !keys.includes(key)) ?? null)
    : null;
}

// Document order: the root keys, then each match, then each of its results.
function firstUnknownField(value: unknown): string | null {
  const root = unknownKey(value, ROOT_KEYS);
  if (root !== null || !isJsonObject(value) || !Array.isArray(value.matches)) return root;
  for (const match of value.matches) {
    const key = unknownKey(match, MATCH_KEYS);
    if (key !== null) return key;
    if (!isJsonObject(match) || !Array.isArray(match.results)) continue;
    for (const result of match.results) {
      const field = unknownKey(result, RESULT_KEYS);
      if (field !== null) return field;
    }
  }
  return null;
}

function readResult(value: unknown, size: number): Result | null {
  if (!isJsonObject(value) || !hasExactKeys(value, RESULT_KEYS)) return null;
  const { moves, elapsedMs } = value;
  if (!isNonnegativeSafeInteger(moves) || !isNonnegativeSafeInteger(elapsedMs)) return null;
  // A completed board takes at least one move for each pair.
  if (moves > MOVES_MAX || moves < size ** 2 / 2 || elapsedMs > ELAPSED_MAX_MS) return null;
  return { moves, elapsedMs };
}

function readMatch(value: unknown, count: number, index: number): Match | null {
  if (!isJsonObject(value) || !hasExactKeys(value, MATCH_KEYS)) return null;
  const { boardCode, results } = value;
  const size = boardSizeOf(count, index);
  if (typeof boardCode !== 'string' || parseBoardCode(boardCode)?.size !== size) return null;
  if (!Array.isArray(results) || results.length > 2) return null;
  const read = results.map((result) => readResult(result, size));
  const checked = read.filter((result) => result !== null);
  return checked.length === read.length ? { boardCode, results: checked } : null;
}

function readNames(value: unknown, started: boolean): readonly string[] | null {
  if (!Array.isArray(value) || !isPlayerCount(value.length)) return null;
  const names = value.filter((name) => typeof name === 'string');
  if (names.length !== value.length || !names.every((name) => name === normalizeName(name)))
    return null;
  return !started || checkNames(names).ok ? names : null;
}

// Matches are played in order, so a match has results only after every earlier match is complete.
function isPlayedInOrder(tournament: Tournament): boolean {
  const turn = nextTurn(tournament);
  const open = turn ? turn.match : tournament.matches.length;
  return tournament.matches.every((match, index) => index <= open || match.results.length === 0);
}

export function parseTournament(value: unknown): Tournament | null {
  if (!isJsonObject(value) || !hasExactKeys(value, ROOT_KEYS)) return null;
  if (value.format !== TOURNAMENT_FORMAT || value.version !== TOURNAMENT_VERSION) return null;
  if (!Array.isArray(value.matches)) return null;
  const started = value.matches.length > 0;
  const players = readNames(value.players, started);
  if (!players) return null;
  if (!started) return { players, matches: [] };
  if (value.matches.length !== matchCount(players.length)) return null;
  const read = value.matches.map((match, index) => readMatch(match, players.length, index));
  const matches = read.filter((match) => match !== null);
  if (matches.length !== read.length) return null;
  if (new Set(matches.map((match) => match.boardCode)).size !== matches.length) return null;
  const tournament = { players, matches };
  return hasStarted(tournament) && isPlayedInOrder(tournament) ? tournament : null;
}

export function decodeTournament(text: string): TournamentDecoding {
  const invalid = { ok: false, notice: TournamentNotice.invalid } as const;
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(value)) return invalid;
  const field = firstUnknownField(value);
  if (field !== null) return { ok: false, notice: `Unknown field: ${field}.` };
  const tournament = parseTournament(value);
  return tournament ? { ok: true, tournament } : invalid;
}
