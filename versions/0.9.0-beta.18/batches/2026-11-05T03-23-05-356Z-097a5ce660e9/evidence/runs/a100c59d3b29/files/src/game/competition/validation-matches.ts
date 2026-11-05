import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { normalizePlayerNames, tournamentMatchPlans, winningSeed } from './rules.ts';
import type {
  TournamentMatch,
  TournamentPlayer,
  TournamentPlayerCount,
  TournamentResult,
} from './types.ts';

const PLAYER_KEYS = ['name', 'seed'] as const;
const MATCH_KEYS = [
  'boardCode',
  'id',
  'number',
  'players',
  'results',
  'round',
  'size',
  'winnerSeed',
] as const;
const RESULT_KEYS = ['elapsedMs', 'moves'] as const;

export function isPlayerCount(value: unknown): value is TournamentPlayerCount {
  return value === 4 || value === 8;
}

export function readTournamentPlayers(
  value: unknown,
  count: TournamentPlayerCount,
): TournamentPlayer[] | null {
  if (!Array.isArray(value) || value.length !== count) return null;
  const players: TournamentPlayer[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry: unknown = value[index];
    if (!isJsonObject(entry) || !hasExactKeys(entry, PLAYER_KEYS)) return null;
    if (typeof entry.name !== 'string' || entry.seed !== index + 1) return null;
    players.push({ name: entry.name, seed: entry.seed });
  }
  const normalized = normalizePlayerNames(players.map((player) => player.name), count);
  return normalized.ok && normalized.names.every((name, index) => name === players[index]?.name)
    ? players
    : null;
}

export function readTournamentMatches(
  value: unknown,
  count: TournamentPlayerCount,
): TournamentMatch[] | null {
  const plans = tournamentMatchPlans(count);
  if (!Array.isArray(value) || value.length !== plans.length) return null;
  const matches: TournamentMatch[] = [];
  const codes = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const entry: unknown = value[index];
    const plan = plans[index];
    if (!plan || !isJsonObject(entry) || !hasExactKeys(entry, MATCH_KEYS)) return null;
    if (
      entry.id !== plan.id ||
      entry.number !== plan.number ||
      entry.round !== plan.round ||
      entry.size !== plan.size ||
      typeof entry.boardCode !== 'string'
    )
      return null;
    const parsed = parseBoardCode(entry.boardCode);
    const players = readNullablePair(entry.players, (seed) => isSeed(seed, count));
    const results = readNullablePair(entry.results, (result) =>
      isTournamentResult(result, plan.size),
    );
    const winnerSeed = entry.winnerSeed;
    if (!parsed || parsed.size !== plan.size || codes.has(entry.boardCode) || !players || !results)
      return null;
    if (winnerSeed !== null && !isSeed(winnerSeed, count)) return null;
    codes.add(entry.boardCode);
    matches.push({
      id: plan.id,
      number: plan.number,
      round: plan.round,
      size: plan.size,
      boardCode: entry.boardCode,
      players,
      results,
      winnerSeed,
    });
  }
  return validateMatchOutcomes(matches, plans, count) ? matches : null;
}

export function isSeed(value: unknown, count: TournamentPlayerCount): value is number {
  return isNonnegativeSafeInteger(value) && value >= 1 && value <= count;
}

function validateMatchOutcomes(
  matches: readonly TournamentMatch[],
  plans: ReturnType<typeof tournamentMatchPlans>,
  count: TournamentPlayerCount,
): boolean {
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const plan = plans[index];
    if (!match || !plan) return false;
    for (const slot of [0, 1] as const) {
      const source = plan.sources[slot];
      const expected =
        source === null ? plan.openingPlayers[slot] : matches[source]?.winnerSeed ?? null;
      if (match.players[slot] !== expected) return false;
      if (match.players[slot] === null && match.results[slot] !== null) return false;
    }
    if (match.results[1] !== null && match.results[0] === null) return false;
    const [firstSeed, secondSeed] = match.players;
    const [firstResult, secondResult] = match.results;
    if (firstResult !== null && secondResult !== null) {
      if (firstSeed === null || secondSeed === null) return false;
      if (
        match.winnerSeed !== winningSeed([firstSeed, secondSeed], [firstResult, secondResult])
      )
        return false;
    } else if (match.winnerSeed !== null) {
      return false;
    }
  }
  return matches.every((match) =>
    match.players.every((seed) => seed === null || isSeed(seed, count)),
  );
}

function readNullablePair<T>(
  value: unknown,
  read: (item: unknown) => item is T,
): readonly [T | null, T | null] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const first: unknown = value[0];
  const second: unknown = value[1];
  if (first !== null && !read(first)) return null;
  if (second !== null && !read(second)) return null;
  return [first, second];
}

function isTournamentResult(value: unknown, size: number): value is TournamentResult {
  if (!isJsonObject(value) || !hasExactKeys(value, RESULT_KEYS)) return false;
  return (
    typeof value.moves === 'number' &&
    Number.isSafeInteger(value.moves) &&
    value.moves >= (size * size) / 2 &&
    value.moves <= MOVES_MAX &&
    typeof value.elapsedMs === 'number' &&
    Number.isFinite(value.elapsedMs) &&
    value.elapsedMs >= 0 &&
    value.elapsedMs <= ELAPSED_MAX_MS
  );
}
