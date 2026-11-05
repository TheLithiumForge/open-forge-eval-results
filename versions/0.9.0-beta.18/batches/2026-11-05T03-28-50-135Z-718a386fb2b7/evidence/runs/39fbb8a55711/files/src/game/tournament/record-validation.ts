import { parseBoardCode } from '../deck.ts';
import { isJsonObject, hasExactKeys, isNonnegativeSafeInteger } from '../saved-format.ts';
import { openingPairings, roundPlan } from './rules.ts';
import { isValidTournamentResult, tournamentWinner } from './result-validation.ts';
import { validateTournamentNames } from './names.ts';
import type {
  RoundName,
  TournamentMatch,
  TournamentPlayer,
  TournamentRecord,
  TournamentResult,
} from './rules.ts';

function readPlayer(value: unknown, index: number): TournamentPlayer | null {
  if (!isJsonObject(value) || !hasExactKeys(value, ['name', 'seed'])) return null;
  if (typeof value.name !== 'string' || value.seed !== index + 1) return null;
  return { name: value.name, seed: index + 1 };
}

function readResult(value: unknown, size: number): TournamentResult | null {
  if (!isJsonObject(value) || !hasExactKeys(value, ['elapsedMs', 'moves'])) return null;
  if (!isNonnegativeSafeInteger(value.moves) || typeof value.elapsedMs !== 'number') return null;
  const result = { elapsedMs: value.elapsedMs, moves: value.moves };
  return isValidTournamentResult(result, size) ? result : null;
}

export function decodeTournamentRecord(value: unknown): TournamentRecord | null {
  if (!isJsonObject(value) || !hasExactKeys(value, ['championSeed', 'matches', 'players']))
    return null;
  if (!Array.isArray(value.players) || (value.players.length !== 4 && value.players.length !== 8))
    return null;
  const players = value.players.map(readPlayer);
  if (players.some((player) => player === null)) return null;
  const acceptedPlayers = players as TournamentPlayer[];
  const names = validateTournamentNames(acceptedPlayers.map((player) => player.name));
  if (names.error || names.names.some((name, index) => name !== acceptedPlayers[index]?.name))
    return null;
  const count = acceptedPlayers.length as 4 | 8;
  const plan = roundPlan(count);
  if (!Array.isArray(value.matches) || value.matches.length !== count - 1) return null;
  const matches: TournamentMatch[] = [];
  const usedCodes = new Set<string>();
  const starts = plan.map((_, index) =>
    plan.slice(0, index).reduce((sum, round) => sum + round.count, 0),
  );
  for (let index = 0; index < value.matches.length; index += 1) {
    const raw = value.matches[index];
    if (
      !isJsonObject(raw) ||
      !hasExactKeys(raw, ['boardCode', 'players', 'results', 'round', 'winnerSeed'])
    )
      return null;
    let roundIndex = plan.findIndex(
      (round, roundIndex) =>
        index >= (starts[roundIndex] ?? 0) && index < (starts[roundIndex] ?? 0) + round.count,
    );
    const round = plan[roundIndex];
    if (!round || raw.round !== round.name || typeof raw.boardCode !== 'string') return null;
    const board = parseBoardCode(raw.boardCode);
    if (!board || board.size !== round.size || usedCodes.has(raw.boardCode)) return null;
    usedCodes.add(raw.boardCode);
    if (
      !Array.isArray(raw.players) ||
      raw.players.length !== 2 ||
      !Array.isArray(raw.results) ||
      raw.results.length !== 2
    )
      return null;
    const playerOne = raw.players[0];
    const playerTwo = raw.players[1];
    if (
      !isNonnegativeSafeInteger(playerOne) ||
      playerOne < 1 ||
      playerOne > count ||
      !isNonnegativeSafeInteger(playerTwo) ||
      playerTwo < 1 ||
      playerTwo > count ||
      playerOne === playerTwo
    )
      return null;
    const firstResult = readResult(raw.results[0], round.size);
    const secondResult = readResult(raw.results[1], round.size);
    if (!firstResult || !secondResult || !isNonnegativeSafeInteger(raw.winnerSeed)) return null;
    let expectedPlayers: readonly [number, number];
    if (roundIndex === 0) {
      const pair = openingPairings(count)[index];
      if (!pair) return null;
      expectedPlayers = pair;
    } else {
      const priorStart = starts[roundIndex - 1] ?? 0;
      const withinRound = index - (starts[roundIndex] ?? 0);
      const previousOne = matches[priorStart + withinRound * 2];
      const previousTwo = matches[priorStart + withinRound * 2 + 1];
      if (!previousOne?.winnerSeed || !previousTwo?.winnerSeed) return null;
      expectedPlayers = [previousOne.winnerSeed, previousTwo.winnerSeed];
    }
    if (playerOne !== expectedPlayers[0] || playerTwo !== expectedPlayers[1]) return null;
    const winnerSeed = tournamentWinner([playerOne, playerTwo], [firstResult, secondResult]);
    if (raw.winnerSeed !== winnerSeed) return null;
    matches.push({
      boardCode: raw.boardCode,
      players: [playerOne, playerTwo],
      results: [firstResult, secondResult],
      round: round.name as RoundName,
      winnerSeed,
    });
  }
  const championSeed = value.championSeed;
  const finalWinner = matches[matches.length - 1]?.winnerSeed;
  return isNonnegativeSafeInteger(championSeed) && championSeed === finalWinner
    ? { championSeed, matches, players: acceptedPlayers }
    : null;
}
