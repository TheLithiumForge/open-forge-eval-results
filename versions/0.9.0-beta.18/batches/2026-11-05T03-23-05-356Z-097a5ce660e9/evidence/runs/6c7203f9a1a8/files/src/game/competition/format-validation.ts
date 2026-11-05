import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { validatePlayerNames } from './names.ts';
import { createTournament } from './pairing.ts';
import { validateTournamentProgress } from './format-progress.ts';
import { readRound } from './format-validation-records.ts';
import type { PlayerCount, Tournament, TournamentPhase, TournamentRound } from './rules.ts';
import type { GameState } from '../game.ts';

function playerCount(value: unknown): PlayerCount | null {
  return value === 4 || value === 8 ? value : null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function phase(value: unknown): TournamentPhase | null {
  return value === 'ready' ||
    value === 'playing' ||
    value === 'next-turn' ||
    value === 'next-match' ||
    value === 'complete'
    ? value
    : null;
}

export interface TournamentSetup {
  readonly playerCount: PlayerCount;
  readonly players: readonly string[];
}

export function readSetup(value: unknown): TournamentSetup | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['playerCount', 'players']) ||
    !isStringArray(value.players)
  )
    return null;
  const count = playerCount(value.playerCount);
  if (count === null || value.players.length !== 8) return null;
  return { playerCount: count, players: value.players };
}

export function readTournament(value: unknown, game: GameState | null): Tournament | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, [
      'matchIndex',
      'playerCount',
      'playerIndex',
      'phase',
      'players',
      'roundIndex',
      'rounds',
    ]) ||
    !isStringArray(value.players) ||
    !Array.isArray(value.rounds)
  )
    return null;
  const count = playerCount(value.playerCount);
  const currentPhase = phase(value.phase);
  if (
    count === null ||
    currentPhase === null ||
    value.players.length !== count ||
    !isNonnegativeSafeInteger(value.roundIndex) ||
    !isNonnegativeSafeInteger(value.matchIndex) ||
    (value.playerIndex !== 0 && value.playerIndex !== 1)
  )
    return null;
  const players = value.players;
  const names = validatePlayerNames(players, count);
  if (!names.ok || names.names.some((name, index) => name !== players[index])) return null;
  const validRounds: TournamentRound[] = [];
  for (const entry of value.rounds) {
    const round = readRound(entry);
    if (!round) return null;
    validRounds.push(round);
  }
  const codes = validRounds.flatMap((round) => round.matches.map((match) => match.boardCode));
  const expected = createTournament(players, codes);
  if (!expected || validRounds.length !== expected.rounds.length) return null;
  const tournament: Tournament = {
    matchIndex: value.matchIndex,
    playerCount: count,
    playerIndex: value.playerIndex,
    phase: currentPhase,
    players,
    roundIndex: value.roundIndex,
    rounds: validRounds,
  };
  for (const [r, round] of validRounds.entries()) {
    const baseline = expected.rounds[r];
    if (
      !baseline ||
      round.name !== baseline.name ||
      round.size !== baseline.size ||
      round.matches.length !== baseline.matches.length
    )
      return null;
    for (const [m, match] of round.matches.entries()) {
      const priorRound = validRounds[r - 1];
      const expectedPlayers =
        r === 0
          ? baseline.matches[m]?.players
          : [
              priorRound?.matches[m * 2]?.winner ?? null,
              priorRound?.matches[m * 2 + 1]?.winner ?? null,
            ];
      if (
        !expectedPlayers ||
        match.players[0] !== expectedPlayers[0] ||
        match.players[1] !== expectedPlayers[1]
      )
        return null;
    }
  }
  return validateTournamentProgress(tournament, game) ? tournament : null;
}
