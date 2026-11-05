import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import {
  createTournament,
  normalizeName,
  recordTournamentResult,
  tournamentRound,
} from './rules.ts';
import type { TournamentRecord, TournamentResult } from './rules.ts';

export function tournamentFields(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isJsonObject(value)) throw new Error('Invalid tournament.');
  const unknown = Object.keys(value).find((key) => !keys.includes(key));
  if (unknown !== undefined) throw new Error(`Unknown field: ${unknown}.`);
  if (keys.some((key) => !Object.hasOwn(value, key))) throw new Error('Invalid tournament.');
  return value;
}

function readResult(value: unknown, size: number): TournamentResult {
  const result = tournamentFields(value, ['elapsedMs', 'moves']);
  if (
    !isNonnegativeSafeInteger(result.moves) ||
    result.moves < size ** 2 / 2 ||
    result.moves > MOVES_MAX ||
    typeof result.elapsedMs !== 'number' ||
    !Number.isFinite(result.elapsedMs) ||
    result.elapsedMs < 0 ||
    result.elapsedMs > ELAPSED_MAX_MS
  )
    throw new Error('Invalid tournament result.');
  return { elapsedMs: result.elapsedMs, moves: result.moves };
}

export function readTournamentRecord(value: unknown): TournamentRecord {
  const record = tournamentFields(value, ['matches', 'players']);
  if (!Array.isArray(record.players) || !Array.isArray(record.matches))
    throw new Error('Invalid tournament.');
  const players: string[] = [];
  for (const name of record.players) {
    if (typeof name !== 'string') throw new Error('Invalid tournament name.');
    players.push(normalizeName(name));
  }
  const matches = record.matches.map((match: unknown) =>
    tournamentFields(match, ['boardCode', 'results']),
  );
  const codes: string[] = [];
  for (const match of matches) {
    if (typeof match.boardCode !== 'string') throw new Error('Invalid tournament deal.');
    codes.push(match.boardCode);
  }
  let event = createTournament(players, codes);
  let unfinished = false;
  for (const [index, match] of matches.entries()) {
    if (
      !Array.isArray(match.results) ||
      match.results.length > 2 ||
      (unfinished && match.results.length)
    )
      throw new Error('Invalid tournament progression.');
    for (const result of match.results) {
      event = recordTournamentResult(
        event,
        index,
        readResult(result, tournamentRound(players.length, index).size),
      );
    }
    unfinished = match.results.length < 2;
  }
  return event;
}
