import { activateCard, advanceGame, createGame, isWon } from '../game.ts';
import type { GameState } from '../game.ts';
import { feedMatch, makeMatches } from './bracket.ts';
import type { MatchSpec } from './bracket.ts';
import type {
  TournamentMatch,
  TournamentPlayer,
  TournamentResult,
  TournamentState,
} from './model.ts';

export function createTournament(
  names: readonly string[],
  specs: readonly MatchSpec[],
  codes: readonly string[],
): TournamentState {
  const players: TournamentPlayer[] = names.map((name, index) => ({ name, seed: index + 1 }));
  const matches = makeMatches(specs, codes);
  return {
    status: 'active',
    players,
    matches,
    currentMatch: 0,
    currentTurn: 0,
    activeGame: null,
    turnRunning: false,
    championSeed: null,
  };
}

export function startTurn(state: TournamentState): TournamentState {
  const match = state.matches[state.currentMatch];
  if (state.status !== 'active' || !match || match.results[state.currentTurn]) return state;
  const game = state.activeGame ?? createGame(match.boardCode);
  if (isWon(game)) return state;
  return { ...state, activeGame: game, turnRunning: true };
}

export function advanceTournamentGame(
  state: TournamentState,
  milliseconds: number,
): TournamentState {
  if (!state.turnRunning || !state.activeGame) return state;
  const game = advanceGame(state.activeGame, milliseconds);
  return game === state.activeGame ? state : { ...state, activeGame: game };
}

export function activateTournamentCard(state: TournamentState, index: number): TournamentState {
  if (!state.turnRunning || !state.activeGame || isWon(state.activeGame)) return state;
  const game = activateCard(state.activeGame, index);
  return game === state.activeGame
    ? state
    : completeTurnIfWon({ ...state, activeGame: game }, game);
}

function completeTurnIfWon(state: TournamentState, game: GameState): TournamentState {
  if (!isWon(game)) return state;
  const match = state.matches[state.currentMatch];
  const seed = match?.playerSeeds[state.currentTurn];
  if (!match || seed === null || seed === undefined) return state;
  const result: TournamentResult = { seed, moves: game.moves, elapsedMs: game.elapsedMs };
  const results: [TournamentResult | null, TournamentResult | null] = [
    match.results[0],
    match.results[1],
  ];
  results[state.currentTurn] = result;
  const winnerSeed =
    results[0] && results[1] ? compareTournamentResults(results[0], results[1]) : null;
  const updated: TournamentMatch = { ...match, results, winnerSeed };
  const matches = state.matches.map((item, index) =>
    index === state.currentMatch ? updated : item,
  );
  const isFinal = state.currentMatch === matches.length - 1;
  return {
    ...state,
    matches,
    turnRunning: false,
    status: isFinal && winnerSeed !== null ? 'finished' : 'active',
    championSeed: isFinal ? winnerSeed : null,
  };
}

export function compareTournamentResults(
  first: TournamentResult,
  second: TournamentResult,
): number {
  if (first.moves !== second.moves) return first.moves < second.moves ? first.seed : second.seed;
  if (first.elapsedMs !== second.elapsedMs)
    return first.elapsedMs < second.elapsedMs ? first.seed : second.seed;
  return Math.min(first.seed, second.seed);
}

export function nextTurn(state: TournamentState): TournamentState {
  const match = state.matches[state.currentMatch];
  if (state.currentTurn !== 0 || !match?.results[0]) return state;
  return { ...state, currentTurn: 1, activeGame: null, turnRunning: false };
}

export function nextMatch(state: TournamentState): TournamentState {
  const match = state.matches[state.currentMatch];
  const index = state.currentMatch + 1;
  if (state.status !== 'active' || !match?.winnerSeed || index >= state.matches.length)
    return state;
  const advanced = feedMatch(state, index);
  return { ...advanced, currentMatch: index, currentTurn: 0, activeGame: null, turnRunning: false };
}
