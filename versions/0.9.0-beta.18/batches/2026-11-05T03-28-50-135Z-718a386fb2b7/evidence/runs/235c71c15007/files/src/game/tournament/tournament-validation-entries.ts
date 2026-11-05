import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { normalizeName, openingSeedPairs, type Tournament, type TournamentMatch, type TournamentPlayer, type TournamentPlayerCount, type TournamentResult, type TournamentRound } from './tournament.ts';
import { compareResults } from './tournament-results.ts';

export function readTournamentPlayer(
  value: unknown,
  count: TournamentPlayerCount,
  allowNull = false,
): TournamentPlayer | null | undefined {
  if (allowNull && value === null) return null;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['name', 'seed']) ||
    typeof value.name !== 'string' ||
    !isNonnegativeSafeInteger(value.seed) ||
    value.seed < 1 ||
    value.seed > count ||
    value.name !== normalizeName(value.name) ||
    Array.from(value.name).length < 2 ||
    Array.from(value.name).length > 20
  )
    return undefined;
  return { name: value.name, seed: value.seed };
}

function readResult(value: unknown, size: number): TournamentResult | null | undefined {
  if (value === null) return null;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['elapsedMs', 'moves']) ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < size ** 2 / 2 ||
    value.moves > MOVES_MAX ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { elapsedMs: value.elapsedMs, moves: value.moves };
}

function readPair<T>(
  value: unknown,
  read: (entry: unknown) => T | null | undefined,
): readonly [T | null, T | null] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const first = read(value[0]);
  const second = read(value[1]);
  if (first === undefined || second === undefined) return null;
  return [first, second];
}

export function readTournamentMatch(
  value: unknown,
  count: TournamentPlayerCount,
  size: number,
): TournamentMatch | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['boardCode', 'players', 'results', 'winner']) ||
    typeof value.boardCode !== 'string'
  )
    return null;
  const parsed = parseBoardCode(value.boardCode);
  if (!parsed || parsed.size !== size) return null;
  const players = readPair(value.players, (entry) => readTournamentPlayer(entry, count, true));
  const results = readPair(value.results, (entry) => readResult(entry, size));
  const winner = readTournamentPlayer(value.winner, count, true);
  if (!players || !results || winner === undefined) return null;
  if (results.some((result, index) => result !== null && players[index] === null)) return null;
  if (winner) {
    if (!players[0] || !players[1] || !results[0] || !results[1]) return null;
    if (!samePlayer(winner, compareResults(players[0], results[0], players[1], results[1]))) return null;
  } else if (results[0] && results[1]) return null;
  return { boardCode: value.boardCode, players, results, winner };
}

export function readTournamentCurrent(
  value: unknown,
  rounds: readonly TournamentRound[],
): Tournament['current'] | undefined {
  if (value === null) return null;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['match', 'round', 'turn']) ||
    !isNonnegativeSafeInteger(value.round) ||
    !isNonnegativeSafeInteger(value.match) ||
    (value.turn !== 0 && value.turn !== 1) ||
    !rounds[value.round]?.matches[value.match]
  )
    return undefined;
  return { match: value.match, round: value.round, turn: value.turn };
}

export function validTournamentPairings(
  entrants: readonly TournamentPlayer[],
  rounds: readonly TournamentRound[],
  count: TournamentPlayerCount,
): boolean {
  const first = rounds[0]?.matches;
  const pairs = openingSeedPairs(count);
  if (!first || first.length !== pairs.length) return false;
  for (let index = 0; index < pairs.length; index += 1) {
    const match = first[index]!;
    const pair = pairs[index]!;
    if (
      !sameNullablePlayer(match.players[0], entrants[pair[0] - 1]!) ||
      !sameNullablePlayer(match.players[1], entrants[pair[1] - 1]!)
    )
      return false;
  }
  for (let round = 1; round < rounds.length; round += 1) {
    for (let matchIndex = 0; matchIndex < rounds[round]!.matches.length; matchIndex += 1) {
      const previous = rounds[round - 1]!.matches;
      const match = rounds[round]!.matches[matchIndex]!;
      if (
        !sameNullablePlayer(match.players[0], previous[matchIndex * 2]?.winner ?? null) ||
        !sameNullablePlayer(match.players[1], previous[matchIndex * 2 + 1]?.winner ?? null)
      )
        return false;
    }
  }
  return true;
}

export function validTournamentProgress(tournament: Tournament): boolean {
  const positions = tournament.rounds.flatMap((round, roundIndex) =>
    round.matches.map((match, matchIndex) => ({ match, matchIndex, roundIndex })),
  );
  if (tournament.status === 'complete') {
    const finalWinner = tournament.rounds.at(-1)?.matches[0]?.winner;
    return (
      tournament.current === null &&
      tournament.champion !== null &&
      positions.every(({ match }) => match.winner !== null) &&
      !!finalWinner &&
      samePlayer(tournament.champion, finalWinner)
    );
  }
  const current = tournament.current;
  if (!current || tournament.champion !== null) return false;
  const currentIndex = positions.findIndex(
    (position) => position.roundIndex === current.round && position.matchIndex === current.match,
  );
  const activeMatch = positions[currentIndex]?.match;
  if (currentIndex < 0 || !activeMatch?.players[0] || !activeMatch.players[1]) return false;
  if (positions.slice(0, currentIndex).some(({ match }) => match.winner === null)) return false;
  if (positions.slice(currentIndex + 1).some(({ match }) => match.winner || match.results.some(Boolean))) return false;
  if (current.turn === 0) return !activeMatch.results[1] && !activeMatch.winner;
  return !!activeMatch.results[0] && (!activeMatch.winner || current.round < tournament.rounds.length - 1);
}

function samePlayer(first: TournamentPlayer, second: TournamentPlayer): boolean {
  return first.seed === second.seed && first.name === second.name;
}

function sameNullablePlayer(
  first: TournamentPlayer | null,
  second: TournamentPlayer | null,
): boolean {
  return first === null ? second === null : second !== null && samePlayer(first, second);
}
