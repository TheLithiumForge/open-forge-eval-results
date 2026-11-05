import { activateCard, advanceGame, createGame, isWon } from '../game.ts';
import type { TournamentResult, TournamentState } from './model.ts';
import { winningSeed } from './scoring.ts';

export function startTournamentTurn(tournament: TournamentState): TournamentState {
  return tournament.phase === 'ready'
    ? { ...tournament, phase: 'playing', paused: false }
    : tournament;
}

export function tickTournament(
  tournament: TournamentState,
  generation: number,
  milliseconds: number,
): TournamentState {
  if (tournament.generation !== generation || tournament.paused) return tournament;
  const game = advanceGame(tournament.game, milliseconds);
  return game === tournament.game ? tournament : { ...tournament, game };
}

export function finishTournamentTurn(
  tournament: TournamentState,
  index: number,
  completedAtMs: number,
): TournamentState {
  if (tournament.phase !== 'playing') return tournament;
  const game = activateCard(tournament.game, index);
  if (game === tournament.game) return tournament;
  if (!isWon(game)) return { ...tournament, game };
  const rounds = [...tournament.rounds];
  const round = rounds[tournament.currentRound];
  const match = round?.matches[tournament.currentMatch];
  if (!round || !match) return tournament;
  const result = { moves: game.moves, elapsedMs: game.elapsedMs };
  const results: readonly [TournamentResult | null, TournamentResult | null] =
    tournament.currentTurn === 0 ? [result, match.results[1]] : [match.results[0], result];
  if (tournament.currentTurn === 0) {
    const matches = [...round.matches];
    matches[tournament.currentMatch] = { ...match, results };
    rounds[tournament.currentRound] = { ...round, matches };
    return { ...tournament, rounds, game, phase: 'nextTurn', paused: true };
  }
  const [firstSeed, secondSeed] = match.players;
  const [firstResult, secondResult] = results;
  if (firstSeed === null || secondSeed === null || !firstResult || !secondResult) return tournament;
  const winnerSeed = winningSeed(firstSeed, firstResult, secondSeed, secondResult);
  const matches = [...round.matches];
  matches[tournament.currentMatch] = { ...match, results, winnerSeed };
  rounds[tournament.currentRound] = { ...round, matches };
  if (tournament.currentRound + 1 < rounds.length) {
    const nextRound = rounds[tournament.currentRound + 1];
    const nextMatches = [...(nextRound?.matches ?? [])];
    const nextMatchIndex = Math.floor(tournament.currentMatch / 2);
    const target = nextMatches[nextMatchIndex];
    if (nextRound && target) {
      const nextPlayers: readonly [number | null, number | null] =
        tournament.currentMatch % 2 === 0
          ? [winnerSeed, target.players[1]]
          : [target.players[0], winnerSeed];
      nextMatches[nextMatchIndex] = { ...target, players: nextPlayers };
      rounds[tournament.currentRound + 1] = { ...nextRound, matches: nextMatches };
    }
  }
  const finalMatch = tournament.currentRound === rounds.length - 1;
  return {
    ...tournament,
    rounds,
    game,
    championSeed: finalMatch ? winnerSeed : null,
    completedAtMs: finalMatch ? completedAtMs : null,
    phase: finalMatch ? 'finished' : 'nextMatch',
    paused: true,
  };
}

export function advanceTournamentTurn(tournament: TournamentState): TournamentState {
  if (tournament.phase !== 'nextTurn') return tournament;
  const match = tournament.rounds[tournament.currentRound]?.matches[tournament.currentMatch];
  if (!match) return tournament;
  return {
    ...tournament,
    currentTurn: 1,
    phase: 'ready',
    game: createGame(match.boardCode),
    generation: tournament.generation + 1,
    paused: true,
  };
}

export function advanceTournamentMatch(tournament: TournamentState): TournamentState {
  if (tournament.phase !== 'nextMatch') return tournament;
  let currentRound = tournament.currentRound;
  let currentMatch = tournament.currentMatch + 1;
  const currentRoundLength = tournament.rounds[currentRound]?.matches.length;
  if (currentRoundLength === undefined) return tournament;
  if (currentMatch >= currentRoundLength) {
    currentRound += 1;
    currentMatch = 0;
  }
  const match = tournament.rounds[currentRound]?.matches[currentMatch];
  if (!match || match.players[0] === null || match.players[1] === null) return tournament;
  return {
    ...tournament,
    currentRound,
    currentMatch,
    currentTurn: 0,
    phase: 'ready',
    game: createGame(match.boardCode),
    generation: tournament.generation + 1,
    paused: true,
  };
}
