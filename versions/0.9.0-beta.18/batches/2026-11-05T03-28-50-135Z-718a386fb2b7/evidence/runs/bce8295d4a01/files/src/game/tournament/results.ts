import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { stageSize } from './rules.ts';
import type {
  Round,
  TournamentMatch,
  TournamentPlayer,
  TournamentState,
  TurnResult,
} from './types.ts';

export function finishTournamentTurn(
  tournament: TournamentState,
  result: TurnResult,
  completedAt: string,
): TournamentState {
  if (
    tournament.phase !== 'playing' ||
    !isValidTurnResult(result, tournament.matches[tournament.currentMatchIndex]?.round)
  )
    return tournament;
  const index = tournament.currentMatchIndex;
  const match = tournament.matches[index];
  if (!match || match.players[tournament.activePlayer] === null) return tournament;
  const results: [TurnResult | null, TurnResult | null] = [match.results[0], match.results[1]];
  results[tournament.activePlayer] = result;
  if (tournament.activePlayer === 0) {
    return {
      ...tournament,
      activePlayer: 1,
      currentGame: null,
      matches: replaceMatch(tournament.matches, index, { ...match, results }),
      phase: 'betweenTurns',
    };
  }

  const firstSeed = match.players[0];
  const secondSeed = match.players[1];
  const firstResult = results[0];
  const secondResult = results[1];
  if (firstSeed === null || secondSeed === null || !firstResult || !secondResult) return tournament;
  const winnerSeed =
    compareTournamentResults(firstResult, firstSeed, secondResult, secondSeed) <= 0
      ? firstSeed
      : secondSeed;
  const finishedMatch = { ...match, results, winnerSeed };
  const matches = [...replaceMatch(tournament.matches, index, finishedMatch)];
  if (match.next) {
    const nextMatch = matches[match.next.matchIndex];
    if (!nextMatch) return tournament;
    const nextPlayers: [number | null, number | null] = [
      nextMatch.players[0],
      nextMatch.players[1],
    ];
    nextPlayers[match.next.playerSlot] = winnerSeed;
    matches[match.next.matchIndex] = { ...nextMatch, players: nextPlayers };
    return {
      ...tournament,
      activePlayer: 0,
      currentGame: null,
      matches,
      phase: 'betweenMatches',
    };
  }
  return {
    ...tournament,
    championSeed: winnerSeed,
    completedAt,
    currentGame: null,
    matches,
    phase: 'complete',
  };
}

export function compareTournamentResults(
  first: TurnResult,
  firstSeed: number,
  second: TurnResult,
  secondSeed: number,
): number {
  return first.moves - second.moves || first.elapsedMs - second.elapsedMs || firstSeed - secondSeed;
}

export function tournamentPlayer(
  tournament: TournamentState,
  seed: number | null,
): TournamentPlayer | null {
  return seed === null ? null : (tournament.players[seed - 1] ?? null);
}

function isValidTurnResult(result: TurnResult, round: Round | undefined): boolean {
  return (
    round !== undefined &&
    Number.isSafeInteger(result.moves) &&
    result.moves >= stageSize(round) ** 2 / 2 &&
    result.moves <= MOVES_MAX &&
    Number.isFinite(result.elapsedMs) &&
    result.elapsedMs >= 0 &&
    result.elapsedMs <= ELAPSED_MAX_MS
  );
}

function replaceMatch(
  matches: readonly TournamentMatch[],
  index: number,
  match: TournamentMatch,
): TournamentMatch[] {
  return matches.map((entry, position) => (position === index ? match : entry));
}
