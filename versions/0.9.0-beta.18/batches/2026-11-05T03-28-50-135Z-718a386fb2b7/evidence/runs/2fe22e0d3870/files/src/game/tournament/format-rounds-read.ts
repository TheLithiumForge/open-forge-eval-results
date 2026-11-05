import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { openingPairings, roundName, roundSizes } from './bracket.ts';
import { winningSeed } from './rules.ts';
import type {
  MatchPlayers,
  MatchResult,
  MatchResults,
  PlayerCount,
  TournamentMatch,
  TournamentRound,
} from './model.ts';

const ROUND_KEYS = ['matches', 'name', 'size'] as const;
const MATCH_KEYS = ['boardCode', 'players', 'results', 'winnerSeed'] as const;
const RESULT_KEYS = ['elapsedMs', 'moves', 'playerSeed'] as const;

export function readRounds(
  value: unknown,
  count: PlayerCount,
  requireComplete: boolean,
): readonly TournamentRound[] | null {
  const sizes = roundSizes(count);
  if (!Array.isArray(value) || value.length !== sizes.length) return null;
  const usedCodes = new Set<string>();
  const rounds: TournamentRound[] = [];
  let previousWinners: readonly (number | null)[] = [];
  for (let roundIndex = 0; roundIndex < sizes.length; roundIndex += 1) {
    const size = sizes[roundIndex];
    const rawRound = value[roundIndex];
    const expectedCount = count / 2 ** (roundIndex + 1);
    if (
      !size ||
      !isJsonObject(rawRound) ||
      !hasExactKeys(rawRound, ROUND_KEYS) ||
      rawRound.name !== roundName(count, roundIndex) ||
      rawRound.size !== size ||
      !Array.isArray(rawRound.matches) ||
      rawRound.matches.length !== expectedCount
    )
      return null;
    const expectedPlayers =
      roundIndex === 0
        ? openingPairings(count)
        : Array.from({ length: expectedCount }, (_, index): MatchPlayers => [
            previousWinners[index * 2] ?? null,
            previousWinners[index * 2 + 1] ?? null,
          ]);
    const matches: TournamentMatch[] = [];
    for (let index = 0; index < expectedCount; index += 1) {
      const match = readMatch(
        rawRound.matches[index],
        expectedPlayers[index] ?? [null, null],
        size,
        usedCodes,
      );
      if (!match || (requireComplete && match.winnerSeed === null)) return null;
      matches.push(match);
    }
    rounds.push({ matches, name: roundName(count, roundIndex), size });
    previousWinners = matches.map((match) => match.winnerSeed);
  }
  return rounds;
}

function readMatch(
  value: unknown,
  expectedPlayers: MatchPlayers,
  size: number,
  usedCodes: Set<string>,
): TournamentMatch | null {
  if (!isJsonObject(value) || !hasExactKeys(value, MATCH_KEYS)) return null;
  if (typeof value.boardCode !== 'string' || parseBoardCode(value.boardCode)?.size !== size)
    return null;
  if (usedCodes.has(value.boardCode)) return null;
  usedCodes.add(value.boardCode);
  const players = readPlayers(value.players);
  if (!players || players[0] !== expectedPlayers[0] || players[1] !== expectedPlayers[1])
    return null;
  const results = readResults(value.results, players, size);
  if (!results) return null;
  const winner = results[0] && results[1] ? winningSeed(results[0], results[1]) : null;
  if (value.winnerSeed !== winner) return null;
  return { boardCode: value.boardCode, players, results, winnerSeed: winner };
}

function readPlayers(value: unknown): MatchPlayers | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const first = value[0];
  const second = value[1];
  return isSeed(first) && isSeed(second) ? [first, second] : null;
}

function isSeed(value: unknown): value is number | null {
  return value === null || (isNonnegativeSafeInteger(value) && value > 0);
}

function readResults(value: unknown, players: MatchPlayers, size: number): MatchResults | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const first = readResult(value[0], players[0], size);
  const second = readResult(value[1], players[1], size);
  return first === undefined || second === undefined ? null : [first, second];
}

function readResult(
  value: unknown,
  seed: number | null,
  size: number,
): MatchResult | null | undefined {
  if (value === null) return null;
  if (
    seed === null ||
    !isJsonObject(value) ||
    !hasExactKeys(value, RESULT_KEYS) ||
    value.playerSeed !== seed ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < size ** 2 / 2 ||
    value.moves > MOVES_MAX ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { elapsedMs: value.elapsedMs, moves: value.moves, playerSeed: seed };
}
