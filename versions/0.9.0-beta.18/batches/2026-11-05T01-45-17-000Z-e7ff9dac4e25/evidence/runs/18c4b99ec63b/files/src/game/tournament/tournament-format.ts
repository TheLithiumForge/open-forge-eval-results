import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { hasDistinctNames, isValidName } from './players.ts';
import { isPlayerCount } from './tournament.ts';
import type { MatchRecord, Tournament, TurnResult } from './tournament.ts';

export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;
const TOURNAMENT_KEYS = ['version', 'players', 'matches'];
const MATCH_KEYS = ['boardCode', 'turns'];
const TURN_KEYS = ['moves', 'elapsedMs'];

export function savedTournament(tournament: Tournament) {
  return {
    version: TOURNAMENT_VERSION,
    players: [...tournament.players],
    matches: tournament.matches.map((match) => ({
      boardCode: match.boardCode,
      turns: match.turns.map(({ moves, elapsedMs }) => ({ moves, elapsedMs })),
    })),
  };
}

export function encodeTournament(tournament: Tournament): string {
  return JSON.stringify(savedTournament(tournament), null, 2);
}

function isPlayerName(value: unknown): value is string {
  return typeof value === 'string' && isValidName(value);
}

// A finished game has at least one move for each pair.
function readTurn(value: unknown, size: number): TurnResult | null {
  if (!isJsonObject(value) || !hasExactKeys(value, TURN_KEYS)) return null;
  const { moves, elapsedMs } = value;
  if (!isNonnegativeSafeInteger(moves) || moves < size ** 2 / 2 || moves > MOVES_MAX) return null;
  if (!isNonnegativeSafeInteger(elapsedMs) || elapsedMs > ELAPSED_MAX_MS) return null;
  return { moves, elapsedMs };
}

function readMatch(value: unknown, size: number): MatchRecord | null {
  if (!isJsonObject(value) || !hasExactKeys(value, MATCH_KEYS)) return null;
  const { boardCode, turns } = value;
  if (typeof boardCode !== 'string' || parseBoardCode(boardCode)?.size !== size) return null;
  if (!Array.isArray(turns) || turns.length > 2) return null;
  const results = turns.map((turn) => readTurn(turn, size));
  return results.every((result): result is TurnResult => result !== null)
    ? { boardCode, turns: results }
    : null;
}

// Every match of a tournament is dealt on the same grid size.
function dealSize(match: unknown): number | null {
  if (!isJsonObject(match) || typeof match.boardCode !== 'string') return null;
  return parseBoardCode(match.boardCode)?.size ?? null;
}

// Matches play in order, so no match has results after one that still waits for a player.
function isInPlayOrder(matches: readonly MatchRecord[]): boolean {
  let waiting = false;
  for (const match of matches) {
    if (waiting && match.turns.length > 0) return false;
    if (match.turns.length < 2) waiting = true;
  }
  return true;
}

export function readTournament(value: unknown): Tournament | null {
  if (!isJsonObject(value) || !hasExactKeys(value, TOURNAMENT_KEYS)) return null;
  const { version, players, matches } = value;
  if (version !== TOURNAMENT_VERSION || !Array.isArray(players) || !Array.isArray(matches))
    return null;
  if (!isPlayerCount(players.length) || matches.length !== players.length - 1) return null;
  if (!players.every(isPlayerName) || !hasDistinctNames(players)) return null;
  const size = dealSize(matches[0]);
  if (size === null) return null;
  const records = matches.map((match) => readMatch(match, size));
  if (!records.every((record): record is MatchRecord => record !== null)) return null;
  return isInPlayOrder(records) ? { players, matches: records } : null;
}

export function decodeTournament(text: string): Tournament | null {
  return isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? readTournament(parseJson(text)) : null;
}
