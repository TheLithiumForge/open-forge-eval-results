import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { openingPairings, normalizePlayerName, tournamentRoundPlan } from './rules.ts';
import { winningSeed } from './scoring.ts';
import type {
  TournamentMatch,
  TournamentPlayer,
  TournamentRecord,
  TournamentResult,
  TournamentRound,
} from './model.ts';

function readPlayers(value: unknown, playerCount: 4 | 8): readonly TournamentPlayer[] | null {
  if (!Array.isArray(value) || value.length !== playerCount) return null;
  const players: TournamentPlayer[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (!isJsonObject(entry) || !hasExactKeys(entry, ['seed', 'name'])) return null;
    const seed = index + 1;
    if (entry.seed !== seed || typeof entry.name !== 'string') return null;
    const name = normalizePlayerName(entry.name);
    if (name !== entry.name || [...name].length < 2 || [...name].length > 20) return null;
    players.push({ seed, name });
  }
  return new Set(players.map(({ name }) => name.toLowerCase())).size === playerCount
    ? players
    : null;
}

function readResult(value: unknown, size: number): TournamentResult | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !hasExactKeys(value, ['moves', 'elapsedMs'])) return undefined;
  const pairs = (size * size) / 2;
  if (
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < pairs ||
    value.moves > MOVES_MAX ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { moves: value.moves, elapsedMs: value.elapsedMs };
}

function readSeed(value: unknown, playerCount: number): number | null | undefined {
  if (value === null) return null;
  if (!isNonnegativeSafeInteger(value) || value < 1 || value > playerCount) return undefined;
  return value;
}

function readMatch(value: unknown, size: number, playerCount: number): TournamentMatch | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['boardCode', 'players', 'results', 'winnerSeed'])
  )
    return null;
  if (typeof value.boardCode !== 'string' || parseBoardCode(value.boardCode)?.size !== size)
    return null;
  if (!Array.isArray(value.players) || value.players.length !== 2) return null;
  if (!Array.isArray(value.results) || value.results.length !== 2) return null;
  const firstSeed = readSeed(value.players[0], playerCount);
  const secondSeed = readSeed(value.players[1], playerCount);
  const firstResult = readResult(value.results[0], size);
  const secondResult = readResult(value.results[1], size);
  const winnerSeed = readSeed(value.winnerSeed, playerCount);
  if (
    firstSeed === undefined ||
    secondSeed === undefined ||
    (firstSeed === secondSeed && firstSeed !== null) ||
    firstResult === undefined ||
    secondResult === undefined ||
    winnerSeed === undefined ||
    (firstSeed === null && firstResult !== null) ||
    (secondSeed === null && secondResult !== null) ||
    (secondResult !== null && firstResult === null)
  )
    return null;
  let expectedWinner: number | null = null;
  if (firstSeed !== null && secondSeed !== null && firstResult !== null && secondResult !== null)
    expectedWinner = winningSeed(firstSeed, firstResult, secondSeed, secondResult);
  if (winnerSeed !== expectedWinner) return null;
  const players: readonly [number | null, number | null] = [firstSeed, secondSeed];
  const results: readonly [TournamentResult | null, TournamentResult | null] = [
    firstResult,
    secondResult,
  ];
  return { boardCode: value.boardCode, players, results, winnerSeed };
}

export function readTournamentPlayers(value: unknown): readonly TournamentPlayer[] | null {
  if (!Array.isArray(value) || (value.length !== 4 && value.length !== 8)) return null;
  const playerCount = value.length === 4 ? 4 : 8;
  return readPlayers(value, playerCount);
}

export function readTournamentRounds(
  value: unknown,
  playerCount: 4 | 8,
): readonly TournamentRound[] | null {
  const plan = tournamentRoundPlan(playerCount);
  if (!Array.isArray(value) || value.length !== plan.length) return null;
  const usedCodes = new Set<string>();
  const rounds: TournamentRound[] = [];
  for (let roundIndex = 0; roundIndex < plan.length; roundIndex += 1) {
    const source = value[roundIndex];
    const spec = plan[roundIndex];
    if (
      !spec ||
      !isJsonObject(source) ||
      !hasExactKeys(source, ['name', 'size', 'matches']) ||
      source.name !== spec.name ||
      source.size !== spec.size ||
      !Array.isArray(source.matches) ||
      source.matches.length !== spec.matchCount
    )
      return null;
    const matches: TournamentMatch[] = [];
    for (const entry of source.matches) {
      const match = readMatch(entry, spec.size, playerCount);
      if (!match || usedCodes.has(match.boardCode)) return null;
      usedCodes.add(match.boardCode);
      matches.push(match);
    }
    rounds.push({ name: spec.name, size: spec.size, matches });
  }
  const firstRound = rounds[0];
  if (!firstRound) return null;
  const pairings = openingPairings(playerCount);
  for (let index = 0; index < pairings.length; index += 1) {
    const match = firstRound.matches[index];
    const pairing = pairings[index];
    if (!match || !pairing || match.players[0] !== pairing[0] || match.players[1] !== pairing[1])
      return null;
  }
  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex += 1) {
    const previous = rounds[roundIndex - 1];
    const round = rounds[roundIndex];
    if (!previous || !round) return null;
    for (let index = 0; index < round.matches.length; index += 1) {
      const match = round.matches[index];
      const left = previous.matches[index * 2]?.winnerSeed ?? null;
      const right = previous.matches[index * 2 + 1]?.winnerSeed ?? null;
      if (!match || match.players[0] !== left || match.players[1] !== right) return null;
    }
  }
  return rounds;
}

export function readTournamentRecord(value: unknown): TournamentRecord | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['startedAtMs', 'completedAtMs', 'players', 'rounds', 'championSeed']) ||
    !isNonnegativeSafeInteger(value.startedAtMs) ||
    !isNonnegativeSafeInteger(value.completedAtMs) ||
    value.startedAtMs > 8_640_000_000_000_000 ||
    value.completedAtMs > 8_640_000_000_000_000 ||
    !isNonnegativeSafeInteger(value.championSeed)
  )
    return null;
  const players = readTournamentPlayers(value.players);
  if (!players) return null;
  const playerCount = players.length === 4 ? 4 : 8;
  const rounds = readTournamentRounds(value.rounds, playerCount);
  if (!rounds) return null;
  const complete = rounds.every((round) =>
    round.matches.every(
      (match) =>
        match.winnerSeed !== null && match.results[0] !== null && match.results[1] !== null,
    ),
  );
  const lastRound = rounds[rounds.length - 1];
  const finalMatch = lastRound?.matches[0];
  if (!complete || !finalMatch || value.championSeed !== finalMatch.winnerSeed) return null;
  return {
    startedAtMs: value.startedAtMs,
    completedAtMs: value.completedAtMs,
    players,
    rounds,
    championSeed: value.championSeed,
  };
}
