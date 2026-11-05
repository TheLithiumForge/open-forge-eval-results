import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { checkNames, countCharacters, normalizeName } from './names.ts';
import { boardSize, isPlayerCount, roundOf } from './rules.ts';
import type { Match, Tournament, TurnResult } from './types.ts';

export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;
export const ExchangeError = { invalid: 'Invalid tournament.' } as const;
const ROOT_KEYS = ['format', 'matches', 'players', 'version'] as const;
const BODY_KEYS = ['matches', 'players'] as const;
const MATCH_KEYS = ['boardCode', 'results'] as const;
const RESULT_KEYS = ['elapsedMs', 'moves'] as const;
// A draft is an entry list that has not started, so its names get the typing treatment later.
const DRAFT_NAME_MAX = 100;

export const DecodeKind = { draft: 'draft', tournament: 'tournament', error: 'error' } as const;
type Decoded =
  | { readonly kind: typeof DecodeKind.draft; readonly players: readonly string[] }
  | { readonly kind: typeof DecodeKind.tournament; readonly tournament: Tournament }
  | { readonly kind: typeof DecodeKind.error; readonly message: string };

export function unknownField(name: string): string {
  return `Unknown field: ${name}.`;
}

// Keys are written in alphabetical order at every level.
export function tournamentBody(tournament: Tournament) {
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

function write(players: readonly string[], matches: ReturnType<typeof tournamentBody>['matches']) {
  const document = {
    format: TOURNAMENT_FORMAT,
    matches,
    players: [...players],
    version: TOURNAMENT_VERSION,
  };
  return JSON.stringify(document, null, 2);
}

export function encodeTournament(tournament: Tournament): string {
  return write(tournament.players, tournamentBody(tournament).matches);
}

// A tournament that has not started carries its entry list and no matches.
export function encodeDraft(players: readonly string[]): string {
  return write(players.map(normalizeName), []);
}

function keysOf(value: unknown): string[] {
  return isJsonObject(value) ? Object.keys(value) : [];
}

function firstUnexpected(value: unknown, allowed: readonly string[]): string | undefined {
  return keysOf(value).find((key) => !allowed.includes(key));
}

// The first field the format doesn't define, in document order: the root, then each match, then
// each of its results.
function firstUnknownField(root: Record<string, unknown>): string | undefined {
  const own = firstUnexpected(root, ROOT_KEYS);
  if (own !== undefined) return own;
  const matches = Array.isArray(root.matches) ? root.matches : [];
  for (const match of matches) {
    const extra = firstUnexpected(match, MATCH_KEYS);
    if (extra !== undefined) return extra;
    const results = isJsonObject(match) && Array.isArray(match.results) ? match.results : [];
    for (const result of results) {
      const inner = firstUnexpected(result, RESULT_KEYS);
      if (inner !== undefined) return inner;
    }
  }
  return undefined;
}

function readResult(value: unknown, size: number): TurnResult | undefined {
  if (!isJsonObject(value) || !hasExactKeys(value, RESULT_KEYS)) return undefined;
  const { moves, elapsedMs } = value;
  if (!isNonnegativeSafeInteger(moves) || !isNonnegativeSafeInteger(elapsedMs)) return undefined;
  if (moves > MOVES_MAX || moves < size ** 2 / 2 || elapsedMs > ELAPSED_MAX_MS) return undefined;
  return { moves, elapsedMs };
}

function readMatch(value: unknown, count: number, index: number): Match | undefined {
  if (!isJsonObject(value) || !hasExactKeys(value, MATCH_KEYS)) return undefined;
  const { boardCode } = value;
  const parsed = typeof boardCode === 'string' ? parseBoardCode(boardCode) : null;
  if (typeof boardCode !== 'string' || !parsed) return undefined;
  if (parsed.size !== boardSize(roundOf(count, index))) return undefined;
  if (!Array.isArray(value.results) || value.results.length > 2) return undefined;
  const results = value.results.map((result) => readResult(result, parsed.size));
  const read = results.filter((result): result is TurnResult => result !== undefined);
  return read.length === results.length ? { boardCode, results: read } : undefined;
}

// Results are a prefix of play order: no match has a result while an earlier one is unfinished.
function isInPlayOrder(matches: readonly Match[]): boolean {
  let open = false;
  for (const match of matches) {
    if (open && match.results.length > 0) return false;
    if (match.results.length < 2) open = true;
  }
  return true;
}

function readPlayers(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || !isPlayerCount(value.length)) return undefined;
  const names = value.filter((name): name is string => typeof name === 'string');
  return names.length === value.length ? names : undefined;
}

// Reads the players and matches of a started tournament. Names must already be in accepted form.
export function readTournament(body: Record<string, unknown>): Tournament | undefined {
  const players = readPlayers(body.players);
  if (!players || !Array.isArray(body.matches) || body.matches.length !== players.length - 1)
    return undefined;
  const checked = checkNames(players);
  if (!checked.ok || checked.names.some((name, index) => name !== players[index])) return undefined;
  const matches = body.matches.map((match, index) => readMatch(match, players.length, index));
  const read = matches.filter((match): match is Match => match !== undefined);
  const codes = new Set(read.map((match) => match.boardCode));
  if (read.length !== matches.length || codes.size !== read.length || !isInPlayOrder(read))
    return undefined;
  return { players, matches: read };
}

export function hasBodyKeys(value: Record<string, unknown>): boolean {
  return hasExactKeys(value, BODY_KEYS);
}

function failure(message: string): Decoded {
  return { kind: DecodeKind.error, message };
}

export function decodeTournament(text: string): Decoded {
  const root = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(root)) return failure(ExchangeError.invalid);
  const extra = firstUnknownField(root);
  if (extra !== undefined) return failure(unknownField(extra));
  if (
    !hasExactKeys(root, ROOT_KEYS) ||
    root.format !== TOURNAMENT_FORMAT ||
    root.version !== TOURNAMENT_VERSION
  )
    return failure(ExchangeError.invalid);
  if (Array.isArray(root.matches) && root.matches.length === 0) {
    const players = readPlayers(root.players)?.map(normalizeName);
    if (!players || players.some((name) => countCharacters(name) > DRAFT_NAME_MAX))
      return failure(ExchangeError.invalid);
    return { kind: DecodeKind.draft, players };
  }
  const tournament = readTournament(root);
  return tournament ? { kind: DecodeKind.tournament, tournament } : failure(ExchangeError.invalid);
}
