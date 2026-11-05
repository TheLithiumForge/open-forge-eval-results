import type {
  Tournament,
  TournamentAction,
  TournamentMatch,
  TournamentPlayer,
  TournamentResult,
} from './model.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';

export function currentMatch(tournament: Tournament): TournamentMatch | null {
  return tournament.rounds[tournament.roundIndex]?.matches[tournament.matchIndex] ?? null;
}

export function currentPlayer(tournament: Tournament): TournamentPlayer | null {
  if (tournament.status !== 'active') return null;
  const match = currentMatch(tournament);
  if (!match || match.winner) return null;
  if (tournament.playerIndex === 0 && match.results[0] && !match.results[1])
    return match.players[1];
  return match.players[tournament.playerIndex] ?? null;
}

export function winnerForMatch(
  players: readonly [TournamentPlayer | null, TournamentPlayer | null],
  results: readonly [TournamentResult | null, TournamentResult | null],
): TournamentPlayer | null {
  const first = players[0];
  const second = players[1];
  const firstResult = results[0];
  const secondResult = results[1];
  if (!first || !second || !firstResult || !secondResult) return null;
  if (firstResult.moves !== secondResult.moves)
    return firstResult.moves < secondResult.moves ? first : second;
  if (firstResult.elapsedMs !== secondResult.elapsedMs)
    return firstResult.elapsedMs < secondResult.elapsedMs ? first : second;
  return first.seed < second.seed ? first : second;
}

export function nextTournamentAction(tournament: Tournament): TournamentAction {
  if (tournament.status !== 'active') return null;
  const match = currentMatch(tournament);
  if (!match) return null;
  if (tournament.playerIndex === 0 && match.results[0] && !match.results[1]) return 'turn';
  return match.winner ? 'match' : null;
}

export function recordTournamentResult(
  tournament: Tournament,
  result: TournamentResult,
): Tournament {
  if (tournament.status !== 'active' || !Number.isSafeInteger(result.moves) || result.moves < 0)
    return tournament;
  if (
    !Number.isFinite(result.elapsedMs) ||
    result.elapsedMs < 0 ||
    result.elapsedMs > ELAPSED_MAX_MS
  )
    return tournament;
  const match = currentMatch(tournament);
  const round = tournament.rounds[tournament.roundIndex];
  if (
    !match ||
    !round ||
    result.moves < round.size ** 2 / 2 ||
    result.moves > MOVES_MAX ||
    !match.players[tournament.playerIndex] ||
    match.results[tournament.playerIndex]
  )
    return tournament;
  const results: readonly [TournamentResult | null, TournamentResult | null] =
    tournament.playerIndex === 0 ? [result, match.results[1]] : [match.results[0], result];
  const winner = winnerForMatch(match.players, results);
  const nextMatch = { ...match, results, winner };
  const nextRounds = tournament.rounds.map((round, index) =>
    index !== tournament.roundIndex
      ? round
      : {
          ...round,
          matches: round.matches.map((entry, matchIndex) =>
            matchIndex === tournament.matchIndex ? nextMatch : entry,
          ),
        },
  );
  const finalRound = tournament.roundIndex === tournament.rounds.length - 1;
  const finalMatch =
    tournament.matchIndex === (tournament.rounds[tournament.roundIndex]?.matches.length ?? 0) - 1;
  const finished = Boolean(winner && finalRound && finalMatch);
  return {
    ...tournament,
    champion: finished ? winner : null,
    rounds: nextRounds,
    status: finished ? 'finished' : 'active',
  };
}

export function advanceTournament(tournament: Tournament): Tournament {
  const action = nextTournamentAction(tournament);
  if (action === 'turn') return { ...tournament, playerIndex: 1 };
  if (action !== 'match') return tournament;
  const round = tournament.rounds[tournament.roundIndex];
  if (!round) return tournament;
  if (tournament.matchIndex + 1 < round.matches.length)
    return { ...tournament, matchIndex: tournament.matchIndex + 1, playerIndex: 0 };
  const nextRound = tournament.rounds[tournament.roundIndex + 1];
  if (!nextRound) return tournament;
  const matches = nextRound.matches.map((match, index) => {
    const first = round.matches[index * 2]?.winner ?? null;
    const second = round.matches[index * 2 + 1]?.winner ?? null;
    return { ...match, players: [first, second] as const };
  });
  const rounds = tournament.rounds.map((entry, index) =>
    index === tournament.roundIndex + 1 ? { ...entry, matches } : entry,
  );
  return {
    ...tournament,
    matchIndex: 0,
    playerIndex: 0,
    roundIndex: tournament.roundIndex + 1,
    rounds,
  };
}
