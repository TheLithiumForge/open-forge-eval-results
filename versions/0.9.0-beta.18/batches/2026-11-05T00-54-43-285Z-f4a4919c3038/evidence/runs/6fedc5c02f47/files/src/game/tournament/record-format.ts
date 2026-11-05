import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { tournamentBracket } from './bracket.ts';
import type { TournamentMatch, TournamentRecord, TurnResult } from './tournament.ts';

function readResult(value: unknown, minimumMoves: number): TurnResult | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['moves', 'elapsedMs']) ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < minimumMoves ||
    value.moves > MOVES_MAX ||
    !isNonnegativeSafeInteger(value.elapsedMs) ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return null;
  return { moves: value.moves, elapsedMs: value.elapsedMs };
}

export function readTournamentRecord(value: unknown): TournamentRecord | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['id', 'createdAt', 'players', 'matches']) ||
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    value.id.length > 128 ||
    !isNonnegativeSafeInteger(value.createdAt) ||
    value.createdAt > 8_640_000_000_000_000 ||
    !Array.isArray(value.players) ||
    (value.players.length !== 4 && value.players.length !== 8) ||
    !Array.isArray(value.matches) ||
    value.matches.length !== value.players.length - 1
  )
    return null;
  const players: string[] = [];
  for (const name of value.players) {
    if (typeof name !== 'string' || !name.trim() || name !== name.trim() || name.length > 80)
      return null;
    players.push(name);
  }
  const matches: TournamentMatch[] = [];
  let size: number | undefined;
  for (const entry of value.matches) {
    if (
      !isJsonObject(entry) ||
      !hasExactKeys(entry, ['boardCode', 'results']) ||
      typeof entry.boardCode !== 'string' ||
      !Array.isArray(entry.results) ||
      entry.results.length > 2
    )
      return null;
    const board = parseBoardCode(entry.boardCode);
    if (!board || (size !== undefined && size !== board.size)) return null;
    size = board.size;
    const results: TurnResult[] = [];
    for (const result of entry.results) {
      const parsed = readResult(result, size ** 2 / 2);
      if (!parsed) return null;
      results.push(parsed);
    }
    matches.push({ boardCode: entry.boardCode, results });
  }
  const record = { id: value.id, createdAt: value.createdAt, players, matches };
  let pending = false;
  for (const match of tournamentBracket(record)) {
    if (pending && matches[match.index]?.results.length) return null;
    if (match.winner === null) pending = true;
  }
  return record;
}

export function hasTournamentChampion(record: TournamentRecord): boolean {
  return tournamentBracket(record).at(-1)?.winner !== null;
}
