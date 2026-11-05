import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { nameProblem, normalizeName } from './names.ts';
import { hasValidDeals, isPlayerCount } from './rules.ts';
import type { Match, Result, Tournament } from './rules.ts';

export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;
export const TournamentNotice = {
  invalid: 'Invalid tournament.',
  loaded: 'Loaded tournament.',
} as const;

const ROOT_KEYS = ['format', 'matches', 'players', 'version'] as const;
const RECORD_KEYS = ['matches', 'players'] as const;
const MATCH_KEYS = ['code', 'results'] as const;
const RESULT_KEYS = ['elapsedMs', 'moves'] as const;

type Decoded =
  | { readonly ok: true; readonly tournament: Tournament }
  | { readonly ok: false; readonly notice: string };

export function unknownFieldNotice(name: string): string {
  return `Unknown field: ${name}.`;
}

// A record holds the tournament itself. Its keys are in alphabetical order at every level.
export function toRecord(tournament: Tournament) {
  return {
    matches: tournament.matches.map((match) => ({
      code: match.code,
      results: match.results.map((result) =>
        result ? { elapsedMs: result.elapsedMs, moves: result.moves } : null,
      ),
    })),
    players: tournament.players,
  };
}

export function encodeTournament(tournament: Tournament): string {
  const { matches, players } = toRecord(tournament);
  const document = { format: TOURNAMENT_FORMAT, matches, players, version: TOURNAMENT_VERSION };
  return JSON.stringify(document, null, 2);
}

function unknownKey(
  value: Record<string, unknown>,
  allowed: readonly string[],
): string | undefined {
  return Object.keys(value).find((key) => !allowed.includes(key));
}

// The first field that the format does not define: root keys first, then each match in order.
function firstUnknownField(root: Record<string, unknown>): string | null {
  const found = unknownKey(root, ROOT_KEYS);
  if (found !== undefined) return found;
  const matches = Array.isArray(root.matches) ? root.matches : [];
  for (const match of matches) {
    if (!isJsonObject(match)) continue;
    const inMatch = unknownKey(match, MATCH_KEYS);
    if (inMatch !== undefined) return inMatch;
    const results = Array.isArray(match.results) ? match.results : [];
    for (const result of results) {
      const inResult = isJsonObject(result) ? unknownKey(result, RESULT_KEYS) : undefined;
      if (inResult !== undefined) return inResult;
    }
  }
  return null;
}

// A missing result stays null. An unusable one is undefined.
function readResult(value: unknown, size: number): Result | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !hasExactKeys(value, RESULT_KEYS)) return undefined;
  const { moves, elapsedMs } = value;
  if (
    !isNonnegativeSafeInteger(moves) ||
    moves > MOVES_MAX ||
    moves < size ** 2 / 2 ||
    !isNonnegativeSafeInteger(elapsedMs) ||
    elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { moves, elapsedMs };
}

function readMatch(value: unknown): Match | null {
  if (!isJsonObject(value) || !hasExactKeys(value, MATCH_KEYS)) return null;
  const { code, results } = value;
  const parsed = typeof code === 'string' ? parseBoardCode(code) : null;
  if (typeof code !== 'string' || !parsed || !Array.isArray(results) || results.length !== 2)
    return null;
  const first = readResult(results[0], parsed.size);
  const second = readResult(results[1], parsed.size);
  return first === undefined || second === undefined ? null : { code, results: [first, second] };
}

// Turns are played in order, so a result never follows a turn that is still waiting.
function isPlayedInOrder(matches: readonly Match[]): boolean {
  let open = false;
  for (const { results } of matches) {
    if (results[1] !== null && results[0] === null) return false;
    if (open && results[0] !== null) return false;
    open = open || results[1] === null;
  }
  return true;
}

function readPlayers(value: unknown, started: boolean): readonly string[] | null {
  if (!Array.isArray(value) || !isPlayerCount(value.length)) return null;
  const players: string[] = [];
  for (const name of value) {
    if (typeof name !== 'string') return null;
    players.push(normalizeName(name));
  }
  return started && nameProblem(players) !== null ? null : players;
}

// With no matches the document is a draft of the entry form, so its names may still be unfinished.
function readBody(value: Record<string, unknown>): Tournament | null {
  const { players: names, matches: list } = value;
  if (!Array.isArray(list)) return null;
  const players = readPlayers(names, list.length > 0);
  if (!players) return null;
  const matches = list.map(readMatch);
  const valid = (match: Match | null): match is Match => match !== null;
  if (!matches.every(valid)) return null;
  if (
    matches.length > 0 &&
    !hasValidDeals(
      players.length,
      matches.map((m) => m.code),
    )
  )
    return null;
  return isPlayedInOrder(matches) ? { players, matches } : null;
}

export function readRecord(value: unknown): Tournament | null {
  return isJsonObject(value) && hasExactKeys(value, RECORD_KEYS) ? readBody(value) : null;
}

export function decodeTournament(text: string): Decoded {
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(value)) return { ok: false, notice: TournamentNotice.invalid };
  const unknown = firstUnknownField(value);
  if (unknown !== null) return { ok: false, notice: unknownFieldNotice(unknown) };
  const tournament =
    hasExactKeys(value, ROOT_KEYS) &&
    value.format === TOURNAMENT_FORMAT &&
    value.version === TOURNAMENT_VERSION
      ? readBody(value)
      : null;
  return tournament ? { ok: true, tournament } : { ok: false, notice: TournamentNotice.invalid };
}
