import { isValidSize, parseBoardCode } from './deck.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from './saved-format.ts';
import { isValidTournamentResult } from './tournament.ts';
import type { Tournament, TournamentMatch, TournamentPlayer } from './tournament.ts';

const TOURNAMENT_KEYS = [
  'id',
  'size',
  'players',
  'rounds',
  'currentRound',
  'currentMatch',
  'turn',
  'status',
  'championId',
  'createdAt',
  'completedAt',
] as const;
const DATE_MAX_MS = 8_640_000_000_000_000;

export function isValidTournament(value: unknown): value is Tournament {
  if (!isJsonObject(value) || !hasExactKeys(value, TOURNAMENT_KEYS)) return false;
  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    value.id.length > 100 ||
    typeof value.size !== 'number' ||
    !isValidSize(value.size) ||
    !isNonnegativeSafeInteger(value.createdAt) ||
    value.createdAt > DATE_MAX_MS ||
    (value.completedAt !== null &&
      (!isNonnegativeSafeInteger(value.completedAt) || value.completedAt > DATE_MAX_MS)) ||
    !isNonnegativeSafeInteger(value.currentRound) ||
    !isNonnegativeSafeInteger(value.currentMatch) ||
    (value.turn !== 0 && value.turn !== 1) ||
    (value.status !== 'active' && value.status !== 'complete')
  )
    return false;
  if (!isUnknownArray(value.players) || ![4, 8].includes(value.players.length)) return false;
  const players: TournamentPlayer[] = [];
  for (let index = 0; index < value.players.length; index += 1) {
    const player = value.players[index];
    if (
      !isJsonObject(player) ||
      !hasExactKeys(player, ['id', 'name']) ||
      !isNonnegativeSafeInteger(player.id) ||
      player.id !== index ||
      typeof player.name !== 'string' ||
      player.name.trim().length === 0 ||
      player.name.length > 60
    )
      return false;
    players.push({ id: player.id, name: player.name });
  }
  if (!isUnknownArray(value.rounds) || value.rounds.length !== Math.log2(players.length))
    return false;
  const rounds: TournamentMatch[][] = [];
  for (let roundIndex = 0; roundIndex < value.rounds.length; roundIndex += 1) {
    const valueRound = value.rounds[roundIndex];
    const expectedCount = players.length / 2 ** (roundIndex + 1);
    if (!isUnknownArray(valueRound) || valueRound.length !== expectedCount) return false;
    const round: TournamentMatch[] = [];
    for (const item of valueRound) {
      if (!isValidMatch(item, Number(value.size), players.length)) return false;
      round.push(item);
    }
    rounds.push(round);
  }
  const lastRound = rounds.at(-1);
  const currentRound = rounds[value.currentRound];
  const currentMatch = currentRound?.[value.currentMatch];
  if (!currentMatch || currentMatch.players[0] === null || currentMatch.players[1] === null)
    return false;
  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
    const round = rounds[roundIndex];
    const priorRound = rounds[roundIndex - 1];
    if (!round) return false;
    for (let matchIndex = 0; matchIndex < round.length; matchIndex += 1) {
      const match = round[matchIndex];
      if (!match) return false;
      const expectedPlayers =
        roundIndex === 0
          ? [matchIndex * 2, matchIndex * 2 + 1]
          : [
              priorRound?.[matchIndex * 2]?.winnerId ?? null,
              priorRound?.[matchIndex * 2 + 1]?.winnerId ?? null,
            ];
      if (match.players[0] !== expectedPlayers[0] || match.players[1] !== expectedPlayers[1])
        return false;
      const beforeCurrent =
        roundIndex < value.currentRound ||
        (roundIndex === value.currentRound && matchIndex < value.currentMatch);
      const afterCurrent =
        roundIndex > value.currentRound ||
        (roundIndex === value.currentRound && matchIndex > value.currentMatch);
      if (beforeCurrent && (match.winnerId === null || !match.results[0] || !match.results[1]))
        return false;
      if (afterCurrent && (match.winnerId !== null || match.results[0] || match.results[1]))
        return false;
      if (
        value.status === 'active' &&
        roundIndex === value.currentRound &&
        matchIndex === value.currentMatch
      ) {
        if (match.winnerId !== null) return false;
        if (value.turn === 0 && match.results[1] !== null) return false;
        if (value.turn === 1 && match.results[0] === null) return false;
      }
    }
  }
  if (value.status === 'active') {
    return value.championId === null && value.completedAt === null;
  }
  return (
    value.currentRound === rounds.length - 1 &&
    value.currentMatch === 0 &&
    value.championId !== null &&
    value.completedAt !== null &&
    rounds.every((round) => round.every((match) => match.winnerId !== null)) &&
    value.championId === lastRound?.[0]?.winnerId
  );
}

function isValidMatch(value: unknown, size: number, playerCount: number): value is TournamentMatch {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['players', 'boardCode', 'results', 'winnerId']) ||
    typeof value.boardCode !== 'string' ||
    parseBoardCode(value.boardCode)?.size !== size ||
    !isUnknownArray(value.players) ||
    value.players.length !== 2 ||
    !isPlayerId(value.players[0], playerCount, true) ||
    !isPlayerId(value.players[1], playerCount, true) ||
    (value.players[0] !== null && value.players[0] === value.players[1]) ||
    !isUnknownArray(value.results) ||
    value.results.length !== 2 ||
    !isUnknownArray(value.results) ||
    (value.results[0] !== null && !isValidTournamentResult(value.results[0], size)) ||
    (value.results[1] !== null && !isValidTournamentResult(value.results[1], size)) ||
    !isPlayerId(value.winnerId, playerCount, true)
  )
    return false;
  for (let slot = 0; slot < 2; slot += 1) {
    if (value.players[slot] === null && value.results[slot] !== null) return false;
  }
  if (value.winnerId === null) return value.results[0] === null || value.results[1] === null;
  const first = value.results[0];
  const second = value.results[1];
  if (!first || !second) return false;
  const expectedWinner =
    first.moves < second.moves
      ? value.players[0]
      : second.moves < first.moves
        ? value.players[1]
        : first.elapsedMs <= second.elapsedMs
          ? value.players[0]
          : value.players[1];
  return value.winnerId === expectedWinner;
}

function isPlayerId(
  value: unknown,
  playerCount: number,
  allowNull: boolean,
): value is number | null {
  return (allowNull && value === null) || (isNonnegativeSafeInteger(value) && value < playerCount);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
