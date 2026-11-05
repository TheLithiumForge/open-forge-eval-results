import { activateCard, advanceGame, createGame, isWon } from '../game.ts';
import { currentMatch } from './bracket.ts';
import type {
  MatchPlayers,
  MatchResult,
  MatchResults,
  TournamentMatch,
  TournamentRound,
  TournamentState,
} from './model.ts';

export function startTurn(state: TournamentState): TournamentState {
  const match = currentMatch(state);
  if (state.status !== 'playing' || state.currentGame || match.results[state.currentTurn])
    return state;
  return { ...state, currentGame: createGame(match.boardCode) };
}

export function advanceTournament(state: TournamentState, milliseconds: number): TournamentState {
  if (!state.currentGame || state.status !== 'playing') return state;
  const game = advanceGame(state.currentGame, milliseconds);
  return game === state.currentGame ? state : { ...state, currentGame: game };
}

export function activateTournament(state: TournamentState, index: number): TournamentState {
  if (!state.currentGame || state.status !== 'playing' || isWon(state.currentGame)) return state;
  const game = activateCard(state.currentGame, index);
  if (game === state.currentGame) return state;
  const updated = { ...state, currentGame: game };
  if (!isWon(game)) return updated;
  const seed = currentMatch(state).players[state.currentTurn];
  if (seed === null) return state;
  return recordResult(updated, { elapsedMs: game.elapsedMs, moves: game.moves, playerSeed: seed });
}

function recordResult(state: TournamentState, result: MatchResult): TournamentState {
  const match = currentMatch(state);
  const results: MatchResults =
    state.currentTurn === 0 ? [result, match.results[1]] : [match.results[0], result];
  const winner = results[0] && results[1] ? winningSeed(results[0], results[1]) : null;
  const replacement = { ...match, results, winnerSeed: winner };
  let rounds = replaceMatch(state.rounds, state.currentRound, state.currentMatch, replacement);
  if (winner !== null && state.currentRound + 1 < rounds.length) {
    const nextIndex = Math.floor(state.currentMatch / 2);
    const slot = state.currentMatch % 2;
    const nextRound = rounds[state.currentRound + 1];
    const nextMatch = nextRound?.matches[nextIndex];
    if (!nextMatch) return { ...state, rounds };
    const players: MatchPlayers =
      slot === 0 ? [winner, nextMatch.players[1]] : [nextMatch.players[0], winner];
    rounds = replaceMatch(rounds, state.currentRound + 1, nextIndex, { ...nextMatch, players });
  }
  return { ...state, rounds };
}

function replaceMatch(
  rounds: readonly TournamentRound[],
  roundIndex: number,
  matchIndex: number,
  match: TournamentMatch,
): readonly TournamentRound[] {
  return rounds.map((round, index) =>
    index !== roundIndex
      ? round
      : {
          ...round,
          matches: round.matches.map((item, itemIndex) =>
            itemIndex === matchIndex ? match : item,
          ),
        },
  );
}

export function winningSeed(first: MatchResult, second: MatchResult): number {
  if (first.moves !== second.moves)
    return first.moves < second.moves ? first.playerSeed : second.playerSeed;
  if (first.elapsedMs !== second.elapsedMs)
    return first.elapsedMs < second.elapsedMs ? first.playerSeed : second.playerSeed;
  return Math.min(first.playerSeed, second.playerSeed);
}

export function nextTurn(state: TournamentState): TournamentState {
  const match = currentMatch(state);
  return state.status === 'playing' &&
    state.currentTurn === 0 &&
    match.results[0] &&
    !match.results[1]
    ? { ...state, currentTurn: 1, currentGame: null }
    : state;
}

export function nextMatch(state: TournamentState): TournamentState {
  const match = currentMatch(state);
  if (state.status !== 'playing' || match.winnerSeed === null) return state;
  const round = state.rounds[state.currentRound];
  if (!round) return state;
  if (state.currentMatch + 1 < round.matches.length)
    return { ...state, currentMatch: state.currentMatch + 1, currentTurn: 0, currentGame: null };
  if (state.currentRound + 1 < state.rounds.length)
    return {
      ...state,
      currentRound: state.currentRound + 1,
      currentMatch: 0,
      currentTurn: 0,
      currentGame: null,
    };
  return { ...state, status: 'complete' };
}
