import { ELAPSED_MAX_MS, MOVES_MAX, isWon } from '../game.ts';
import { isNonnegativeSafeInteger } from '../saved-format.ts';
import { compareResults, tournamentMatch } from './rules.ts';
import type { GameState } from '../game.ts';
import type { MatchResult, Tournament, TournamentMatch } from './rules.ts';

function resultFits(result: MatchResult | null, name: string | null, size: number): boolean {
  return (
    result === null ||
    (name !== null &&
      result.name === name &&
      isNonnegativeSafeInteger(result.moves) &&
      result.moves >= (size * size) / 2 &&
      result.moves <= MOVES_MAX &&
      Number.isFinite(result.elapsedMs) &&
      result.elapsedMs >= 0 &&
      result.elapsedMs <= ELAPSED_MAX_MS)
  );
}

function matchIsFinished(match: TournamentMatch): boolean {
  return match.results[0] !== null && match.results[1] !== null && match.winner !== null;
}

function validateResults(rounds: Tournament['rounds'], players: readonly string[]): boolean {
  for (const round of rounds) {
    for (const match of round.matches) {
      const [first, second] = match.players;
      const [firstResult, secondResult] = match.results;
      if (
        !resultFits(firstResult, first, round.size) ||
        !resultFits(secondResult, second, round.size)
      )
        return false;
      if ((match.winner === null) !== (firstResult === null || secondResult === null)) return false;
      if (match.winner !== null) {
        if (!first || !second || !firstResult || !secondResult) return false;
        const winner =
          compareResults(
            firstResult,
            secondResult,
            players.indexOf(first),
            players.indexOf(second),
          ) <= 0
            ? first
            : second;
        if (match.winner !== winner) return false;
      }
    }
  }
  return true;
}

export function validateTournamentProgress(
  tournament: Tournament,
  game: GameState | null,
): boolean {
  if (!validateResults(tournament.rounds, tournament.players)) return false;
  const { roundIndex, matchIndex, phase, playerIndex, rounds } = tournament;
  const currentRound = rounds[roundIndex];
  const current = tournamentMatch(tournament);
  if (!currentRound || !current) return false;
  for (const [r, round] of rounds.entries()) {
    for (const [m, match] of round.matches.entries()) {
      const before = r < roundIndex || (r === roundIndex && m < matchIndex);
      const after = r > roundIndex || (r === roundIndex && m > matchIndex);
      if (before && !matchIsFinished(match)) return false;
      if (after && (match.results.some((result) => result !== null) || match.winner !== null))
        return false;
    }
  }
  const finished = phase === 'next-match' || phase === 'complete';
  if (finished !== matchIsFinished(current)) return false;
  if (phase === 'next-turn' && (playerIndex !== 0 || !current.results[0] || current.results[1]))
    return false;
  if (
    (phase === 'ready' || phase === 'playing') &&
    (playerIndex === 0
      ? current.results.some((result) => result !== null)
      : !current.results[0] || current.results[1])
  )
    return false;
  if (finished && (playerIndex !== 1 || !current.winner)) return false;
  const finalMatch =
    roundIndex === rounds.length - 1 && matchIndex === currentRound.matches.length - 1;
  if (finished && (phase === 'complete') !== finalMatch) return false;
  if (phase === 'playing')
    return game !== null && game.boardCode === current.boardCode && !isWon(game);
  if (phase === 'next-turn' || phase === 'next-match')
    return game !== null && game.boardCode === current.boardCode && isWon(game);
  return game === null;
}
