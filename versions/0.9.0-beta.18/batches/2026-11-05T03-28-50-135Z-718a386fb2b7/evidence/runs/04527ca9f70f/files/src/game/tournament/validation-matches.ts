import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { matchSpecs } from './bracket.ts';
import type { TournamentMatch, TournamentResult, TournamentRound } from './model.ts';
import { compareTournamentResults } from './rules.ts';

const MATCH_KEYS = [
  'boardCode',
  'feeders',
  'matchNumber',
  'playerSeeds',
  'results',
  'round',
  'size',
  'winnerSeed',
];

export function readTournamentMatches(
  value: unknown,
  playerCount: number,
): TournamentMatch[] | null {
  const specs = matchSpecs(playerCount);
  if (!Array.isArray(value) || value.length !== specs.length) return null;
  const matches: TournamentMatch[] = [];
  const codes = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const item: unknown = value[index];
    const spec = specs[index];
    if (!spec || !isJsonObject(item) || !hasExactKeys(item, MATCH_KEYS)) return null;
    const boardCode = item.boardCode;
    if (
      typeof boardCode !== 'string' ||
      parseBoardCode(boardCode)?.size !== spec.size ||
      codes.has(boardCode) ||
      !isRound(item.round) ||
      item.round !== spec.round ||
      item.matchNumber !== spec.matchNumber ||
      item.size !== spec.size
    )
      return null;
    const playerSeeds = readSeeds(item.playerSeeds, playerCount);
    const feeders = readFeeders(item.feeders, specs.length);
    const results = readResults(item.results, playerSeeds, spec.size);
    if (!playerSeeds || !sameFeeders(feeders, spec.feeders) || !results) return null;
    if (!(item.winnerSeed === null || isNonnegativeSafeInteger(item.winnerSeed))) return null;
    const winner =
      results[0] && results[1] ? compareTournamentResults(results[0], results[1]) : null;
    if (item.winnerSeed !== winner) return null;
    codes.add(boardCode);
    matches.push({
      boardCode,
      feeders,
      matchNumber: spec.matchNumber,
      playerSeeds,
      results,
      round: spec.round,
      size: spec.size,
      winnerSeed: winner,
    });
  }
  return matches;
}

function readSeeds(value: unknown, count: number): readonly [number | null, number | null] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const first: unknown = value[0];
  const second: unknown = value[1];
  const valid = (seed: unknown): seed is number | null =>
    seed === null || (isNonnegativeSafeInteger(seed) && seed > 0 && seed <= count);
  return valid(first) && valid(second) ? [first, second] : null;
}

function readFeeders(value: unknown, count: number): readonly [number, number] | null | false {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length !== 2) return false;
  const first: unknown = value[0];
  const second: unknown = value[1];
  if (!isNonnegativeSafeInteger(first) || !isNonnegativeSafeInteger(second)) return false;
  if (first >= count || second >= count || first === second) return false;
  return [first, second];
}

function sameFeeders(
  actual: readonly [number, number] | null | false,
  expected: readonly [number, number] | null,
): actual is readonly [number, number] | null {
  return (
    actual !== false &&
    (actual === null
      ? expected === null
      : expected !== null && actual[0] === expected[0] && actual[1] === expected[1])
  );
}

function readResults(
  value: unknown,
  seeds: readonly [number | null, number | null] | null,
  size: number,
): readonly [TournamentResult | null, TournamentResult | null] | null {
  if (!seeds || !Array.isArray(value) || value.length !== 2) return null;
  const first = readResult(value[0], seeds[0], size);
  const second = readResult(value[1], seeds[1], size);
  if (first === false || second === false) return null;
  return [first, second];
}

function readResult(
  value: unknown,
  seed: number | null,
  size: number,
): TournamentResult | null | false {
  if (value === null) return null;
  if (!isJsonObject(value) || !hasExactKeys(value, ['elapsedMs', 'moves', 'seed'])) return false;
  const moves = value.moves;
  const elapsedMs = value.elapsedMs;
  if (
    seed === null ||
    value.seed !== seed ||
    !isNonnegativeSafeInteger(moves) ||
    moves > MOVES_MAX ||
    moves < size ** 2 / 2 ||
    typeof elapsedMs !== 'number' ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    elapsedMs > ELAPSED_MAX_MS
  )
    return false;
  return { elapsedMs, moves, seed };
}

function isRound(value: unknown): value is TournamentRound {
  return value === 'Quarterfinal' || value === 'Semifinal' || value === 'Final';
}
