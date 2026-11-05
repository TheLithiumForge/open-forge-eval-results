import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, isWon, MOVES_MAX } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  parseJson,
} from '../saved-format.ts';
import type { Tournament, TurnResult } from './tournament.ts';

function readGame(value: unknown) {
  try {
    return decodeSnapshot(JSON.stringify(value));
  } catch {
    return null;
  }
}

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

export function serializedTournament(tournament: Tournament) {
  return {
    ...tournament,
    game: tournament.game ? parseJson(encodeSnapshot(tournament.game)) : null,
  };
}

export function readTournament(value: unknown): Tournament | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['id', 'players', 'boardCodes', 'results', 'stage', 'game']) ||
    typeof value.id !== 'string' ||
    value.id.trim().length === 0 ||
    value.id.length > 100 ||
    !Array.isArray(value.players) ||
    (value.players.length !== 4 && value.players.length !== 8) ||
    !Array.isArray(value.boardCodes) ||
    value.boardCodes.length !== value.players.length - 1 ||
    !Array.isArray(value.results) ||
    value.results.length > value.boardCodes.length * 2
  )
    return null;
  const players: string[] = [];
  for (const name of value.players) {
    if (typeof name !== 'string' || !name.trim() || name.length > 60 || name !== name.trim())
      return null;
    players.push(name);
  }
  const boardCodes: string[] = [];
  let size: number | undefined;
  for (const code of value.boardCodes) {
    if (typeof code !== 'string') return null;
    const board = parseBoardCode(code);
    if (!board || (size !== undefined && size !== board.size)) return null;
    size = board.size;
    boardCodes.push(code);
  }
  if (size === undefined) return null;
  const results: TurnResult[] = [];
  for (const result of value.results) {
    const parsed = readResult(result, size ** 2 / 2);
    if (!parsed) return null;
    results.push(parsed);
  }
  const stage = value.stage;
  const finished = results.length === boardCodes.length * 2;
  if (
    (stage !== 'ready' &&
      stage !== 'playing' &&
      stage !== 'turn-complete' &&
      stage !== 'match-complete' &&
      stage !== 'complete') ||
    (stage === 'complete') !== finished ||
    (stage === 'turn-complete' && results.length % 2 !== 1) ||
    (stage === 'match-complete' && (results.length === 0 || results.length % 2 !== 0))
  )
    return null;
  const game = value.game === null ? null : readGame(value.game);
  if (stage === 'playing') {
    if (!game || isWon(game) || game.boardCode !== boardCodes[Math.floor(results.length / 2)])
      return null;
  } else if (value.game !== null) return null;
  return { id: value.id, players, boardCodes, results, stage, game };
}
