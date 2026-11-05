import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { isAcceptedTournamentName } from './names.ts';
import { matchPlans } from './pairing.ts';
import { winningSeed } from './rules.ts';
import type { Entrant, TournamentMatch, TournamentResult } from './rules.ts';

const MATCH_KEYS = [
  'round',
  'number',
  'size',
  'boardCode',
  'playerSeeds',
  'results',
  'winnerSeed',
  'advanceTo',
];

export function readPlayers(value: unknown, count: 4 | 8): Entrant[] | null {
  if (!Array.isArray(value) || value.length !== count) return null;
  const players: Entrant[] = [];
  for (let index = 0; index < count; index += 1) {
    const item: unknown = value[index];
    if (!isJsonObject(item) || !hasExactKeys(item, ['seed', 'name'])) return null;
    if (
      item.seed !== index + 1 ||
      typeof item.name !== 'string' ||
      !isAcceptedTournamentName(item.name)
    )
      return null;
    players.push({ seed: item.seed, name: item.name });
  }
  return new Set(players.map((player) => player.name.toLowerCase())).size === count
    ? players
    : null;
}

function readResult(value: unknown, size: number): TournamentResult | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !hasExactKeys(value, ['moves', 'elapsedMs'])) return undefined;
  const { moves, elapsedMs } = value;
  if (
    !isNonnegativeSafeInteger(moves) ||
    moves < (size * size) / 4 ||
    moves > MOVES_MAX ||
    typeof elapsedMs !== 'number' ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { moves, elapsedMs };
}

export function readMatches(value: unknown, count: 4 | 8): TournamentMatch[] | null {
  const plans = matchPlans(count);
  if (!Array.isArray(value) || value.length !== plans.length) return null;
  const usedCodes = new Set<string>();
  const matches: TournamentMatch[] = [];
  for (let index = 0; index < plans.length; index += 1) {
    const item: unknown = value[index];
    const plan = plans[index];
    if (!plan || !isJsonObject(item) || !hasExactKeys(item, MATCH_KEYS)) return null;
    const boardCode = item.boardCode;
    const parsedCode = typeof boardCode === 'string' ? parseBoardCode(boardCode) : null;
    if (
      item.round !== plan.round ||
      item.number !== plan.number ||
      item.size !== plan.size ||
      !parsedCode ||
      parsedCode.size !== plan.size ||
      typeof boardCode !== 'string' ||
      usedCodes.has(boardCode)
    )
      return null;
    usedCodes.add(boardCode);
    const playerSeeds = readPlayerSeeds(item.playerSeeds, count);
    const resultValues = item.results;
    if (!playerSeeds || !Array.isArray(resultValues) || resultValues.length !== 2) return null;
    const first = readResult(resultValues[0], plan.size);
    const second = readResult(resultValues[1], plan.size);
    if (first === undefined || second === undefined) return null;
    const advanceTo = readAdvance(item.advanceTo, plan.advanceTo);
    const winnerSeed = item.winnerSeed;
    if (
      advanceTo === undefined ||
      !(
        winnerSeed === null ||
        (isNonnegativeSafeInteger(winnerSeed) && winnerSeed > 0 && winnerSeed <= count)
      )
    )
      return null;
    matches.push({
      ...plan,
      boardCode,
      playerSeeds,
      results: [first, second],
      winnerSeed,
      advanceTo,
    });
  }
  return matches;
}

function readPlayerSeeds(value: unknown, count: 4 | 8): [number | null, number | null] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const first = value[0];
  const second = value[1];
  if (!isPlayerSeed(first, count) || !isPlayerSeed(second, count)) return null;
  return [first, second];
}

function isPlayerSeed(value: unknown, count: 4 | 8): value is number | null {
  return value === null || (isNonnegativeSafeInteger(value) && value > 0 && value <= count);
}

function readAdvance(
  value: unknown,
  expected: TournamentMatch['advanceTo'],
): TournamentMatch['advanceTo'] | undefined {
  if (expected === null) return value === null ? null : undefined;
  if (!isJsonObject(value) || !hasExactKeys(value, ['matchIndex', 'slot'])) return undefined;
  return value.matchIndex === expected.matchIndex && value.slot === expected.slot
    ? expected
    : undefined;
}

export function isBracketValid(matches: readonly TournamentMatch[], count: 4 | 8): boolean {
  const plans = matchPlans(count);
  const expectedSeeds = plans.map((plan) => copyPlayerSeeds(plan.playerSeeds));
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const seeds = expectedSeeds[index];
    if (!match || !seeds || match.playerSeeds.some((seed, slot) => seed !== seeds[slot]))
      return false;
    const [first, second] = match.results;
    if (second && !first) return false;
    if (first && second) {
      const firstSeed = match.playerSeeds[0];
      const secondSeed = match.playerSeeds[1];
      if (
        firstSeed === null ||
        secondSeed === null ||
        match.winnerSeed !== winningSeed(firstSeed, first, secondSeed, second)
      )
        return false;
      if (match.advanceTo) {
        const target = expectedSeeds[match.advanceTo.matchIndex];
        if (!target || target[match.advanceTo.slot] !== null) return false;
        target[match.advanceTo.slot] = match.winnerSeed;
      }
    } else if (match.winnerSeed !== null) return false;
  }
  return true;
}

function copyPlayerSeeds(
  seeds: readonly [number | null, number | null],
): [number | null, number | null] {
  return [seeds[0], seeds[1]];
}

export function isProgressValid(
  matches: readonly TournamentMatch[],
  index: number,
  turn: 0 | 1,
  phase: unknown,
  finishedAt: unknown,
): boolean {
  const active = matches[index];
  if (!active) return false;
  for (let before = 0; before < index; before += 1) if (!complete(matches[before])) return false;
  for (let after = index + 1; after < matches.length; after += 1)
    if (matches[after]?.results.some(Boolean)) return false;
  const [first, second] = active.results;
  if (phase === 'finished')
    return index === matches.length - 1 && complete(active) && finishedAt !== null;
  if (finishedAt !== null) return false;
  if (phase === 'ready' || phase === 'playing')
    return turn === 0 ? !first && !second : !!first && !second;
  if (phase === 'turnComplete')
    return turn === 0 ? !!first && !second : !!first && !!second && index < matches.length - 1;
  return false;
}

function complete(match: TournamentMatch | undefined): boolean {
  return !!match?.results[0] && !!match.results[1] && match.winnerSeed !== null;
}
