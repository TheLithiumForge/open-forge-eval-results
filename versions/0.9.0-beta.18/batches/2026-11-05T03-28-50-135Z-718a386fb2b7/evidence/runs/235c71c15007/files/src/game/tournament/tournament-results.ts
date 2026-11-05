import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { currentMatch } from './tournament.ts';
import type { Tournament, TournamentMatch, TournamentPlayer, TournamentPosition, TournamentResult, TournamentRound } from './tournament.ts';

export function compareResults(
  firstPlayer: TournamentPlayer,
  first: TournamentResult,
  secondPlayer: TournamentPlayer,
  second: TournamentResult,
): TournamentPlayer {
  if (first.moves !== second.moves) return first.moves < second.moves ? firstPlayer : secondPlayer;
  if (first.elapsedMs !== second.elapsedMs)
    return first.elapsedMs < second.elapsedMs ? firstPlayer : secondPlayer;
  return firstPlayer.seed < secondPlayer.seed ? firstPlayer : secondPlayer;
}

export function recordTournamentResult(
  tournament: Tournament,
  result: TournamentResult,
): Tournament {
  const position = tournament.current;
  const match = currentMatch(tournament);
  if (!position || !match || tournament.status !== 'active' || match.results[position.turn]) return tournament;
  if (
    !Number.isSafeInteger(result.moves) ||
    result.moves < tournament.rounds[position.round]!.size ** 2 / 2 ||
    result.moves > MOVES_MAX ||
    !Number.isFinite(result.elapsedMs) ||
    result.elapsedMs < 0 ||
    result.elapsedMs > ELAPSED_MAX_MS
  )
    return tournament;
  const results = [...match.results] as [TournamentResult | null, TournamentResult | null];
  results[position.turn] = result;
  if (!results[0] || !results[1]) return updateMatch(tournament, position, { ...match, results });

  const first = match.players[0];
  const second = match.players[1];
  if (!first || !second) return tournament;
  const winner = compareResults(first, results[0], second, results[1]);
  const updatedMatch = { ...match, results, winner };
  const updatedRounds = replaceMatch(tournament.rounds, position, updatedMatch);
  if (position.round === tournament.rounds.length - 1)
    return { ...tournament, champion: winner, current: null, rounds: updatedRounds, status: 'complete' };

  const nextRound = updatedRounds[position.round + 1];
  const nextMatchIndex = Math.floor(position.match / 2);
  const nextMatch = nextRound?.matches[nextMatchIndex];
  if (!nextRound || !nextMatch) return tournament;
  const players = [...nextMatch.players] as [TournamentPlayer | null, TournamentPlayer | null];
  players[position.match % 2] = winner;
  const advancedRound = {
    ...nextRound,
    matches: nextRound.matches.map((item, index) => (index === nextMatchIndex ? { ...item, players } : item)),
  };
  return {
    ...tournament,
    rounds: updatedRounds.map((round, index) => (index === position.round + 1 ? advancedRound : round)),
  };
}

export function advanceTournamentTurn(tournament: Tournament): Tournament {
  const position = tournament.current;
  const match = currentMatch(tournament);
  if (!position || position.turn !== 0 || !match?.results[0] || match.results[1]) return tournament;
  return { ...tournament, current: { ...position, turn: 1 } };
}

export function advanceTournamentMatch(tournament: Tournament): Tournament {
  const position = tournament.current;
  const match = currentMatch(tournament);
  if (!position || !match?.winner || tournament.status !== 'active') return tournament;
  const currentIndex = flatIndex(tournament.rounds, position.round, position.match);
  let nextIndex = 0;
  for (let round = 0; round < tournament.rounds.length; round += 1) {
    for (let index = 0; index < tournament.rounds[round]!.matches.length; index += 1) {
      if (nextIndex === currentIndex + 1)
        return { ...tournament, current: { round, match: index, turn: 0 } };
      nextIndex += 1;
    }
  }
  return tournament;
}

function updateMatch(tournament: Tournament, position: TournamentPosition, match: TournamentMatch): Tournament {
  return { ...tournament, rounds: replaceMatch(tournament.rounds, position, match) };
}

function replaceMatch(
  rounds: readonly TournamentRound[],
  position: TournamentPosition,
  match: TournamentMatch,
): readonly TournamentRound[] {
  return rounds.map((round, index) =>
    index === position.round
      ? { ...round, matches: round.matches.map((item, matchIndex) => (matchIndex === position.match ? match : item)) }
      : round,
  );
}

function flatIndex(rounds: readonly TournamentRound[], targetRound: number, targetMatch: number): number {
  let index = targetMatch;
  for (let round = 0; round < targetRound; round += 1) index += rounds[round]!.matches.length;
  return index;
}
