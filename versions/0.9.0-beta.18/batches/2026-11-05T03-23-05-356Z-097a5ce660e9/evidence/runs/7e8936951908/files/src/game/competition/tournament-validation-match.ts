import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { compareTournamentResults } from './tournament-progress.ts';
import type { TournamentMatch, TournamentResult } from './tournament.ts';

export function readTournamentMatch(
  value: unknown,
  expected: TournamentMatch | undefined,
): TournamentMatch | null {
  if (
    !expected ||
    !isJsonObject(value) ||
    !hasExactKeys(value, ['round', 'stage', 'boardCode', 'players', 'results', 'winner'])
  )
    return null;
  if (
    value.round !== expected.round ||
    value.stage !== expected.stage ||
    typeof value.boardCode !== 'string' ||
    value.boardCode !== expected.boardCode
  )
    return null;
  const code = parseBoardCode(value.boardCode);
  if (!code || !twoValues(value.players) || !twoValues(value.results)) return null;
  const firstSeed = value.players[0];
  const secondSeed = value.players[1];
  if (!isTournamentSeed(firstSeed) || !isTournamentSeed(secondSeed)) return null;
  if (
    expected.round === 1 &&
    (firstSeed !== expected.players[0] || secondSeed !== expected.players[1])
  )
    return null;
  const minimumMoves = code.size ** 2 / 2;
  const firstResult = readResult(value.results[0], minimumMoves);
  const secondResult = readResult(value.results[1], minimumMoves);
  if (firstResult === undefined || secondResult === undefined) return null;
  if (
    (firstSeed === null && firstResult !== null) ||
    (secondSeed === null && secondResult !== null) ||
    (firstResult && firstResult.seed !== firstSeed) ||
    (secondResult && secondResult.seed !== secondSeed)
  )
    return null;
  const results: readonly [TournamentResult | null, TournamentResult | null] = [
    firstResult,
    secondResult,
  ];
  const winner =
    firstResult && secondResult ? compareTournamentResults(firstResult, secondResult) : null;
  if (value.winner !== winner) return null;
  return {
    round: expected.round,
    stage: expected.stage,
    boardCode: expected.boardCode,
    players: [firstSeed, secondSeed],
    results,
    winner,
  };
}

function twoValues(value: unknown): value is [unknown, unknown] {
  return Array.isArray(value) && value.length === 2;
}

function isTournamentSeed(value: unknown): value is number | null {
  return value === null || (isNonnegativeSafeInteger(value) && value >= 1 && value <= 8);
}

function readResult(value: unknown, minimumMoves: number): TournamentResult | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !hasExactKeys(value, ['seed', 'moves', 'elapsedMs']))
    return undefined;
  if (
    !isNonnegativeSafeInteger(value.seed) ||
    value.seed < 1 ||
    value.seed > 8 ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < minimumMoves ||
    value.moves > MOVES_MAX ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { seed: value.seed, moves: value.moves, elapsedMs: value.elapsedMs };
}
