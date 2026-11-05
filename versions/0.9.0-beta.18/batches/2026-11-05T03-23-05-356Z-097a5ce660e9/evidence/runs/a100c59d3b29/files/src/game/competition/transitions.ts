import { createGame, activateCard, advanceGame, isWon } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { tournamentMatchPlans, winningSeed } from './rules.ts';
import type {
  PastTournament,
  TournamentMatch,
  TournamentPlayerCount,
  TournamentResult,
  TournamentState,
} from './types.ts';

export function createTournament(
  playerCount: TournamentPlayerCount,
  names: readonly string[],
  boardCodes: readonly string[],
): TournamentState | null {
  const plans = tournamentMatchPlans(playerCount);
  if (names.length !== playerCount || boardCodes.length !== plans.length) return null;
  const players = names.map((name, index) => ({ name, seed: index + 1 }));
  const matches: TournamentMatch[] = [];
  const usedCodes = new Set<string>();
  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index];
    const boardCode = boardCodes[index];
    if (!plan || !boardCode) return null;
    const parsed = parseBoardCode(boardCode);
    if (!parsed || parsed.size !== plan.size || usedCodes.has(boardCode)) return null;
    usedCodes.add(boardCode);
    matches.push({
      id: plan.id,
      number: plan.number,
      round: plan.round,
      size: plan.size,
      boardCode,
      players: plan.openingPlayers,
      results: [null, null],
      winnerSeed: null,
    });
  }
  const first = matches[0];
  if (!first) return null;
  return {
    playerCount,
    players,
    matches,
    activeMatch: 0,
    turnIndex: 0,
    phase: 'ready',
    game: createGame(first.boardCode),
  };
}

export function startTournamentTurn(state: TournamentState): TournamentState {
  return state.phase === 'ready' ? { ...state, phase: 'playing' } : state;
}

export function tickTournament(state: TournamentState, milliseconds: number): TournamentState {
  if (state.phase !== 'playing') return state;
  const game = advanceGame(state.game, milliseconds);
  return game === state.game ? state : { ...state, game };
}

export function activateTournamentCard(state: TournamentState, index: number): TournamentState {
  if (state.phase !== 'playing') return state;
  const game = activateCard(state.game, index);
  if (game === state.game) return state;
  if (!isWon(game)) return { ...state, game };

  const active = state.matches[state.activeMatch];
  if (!active) return state;
  const result: TournamentResult = { moves: game.moves, elapsedMs: game.elapsedMs };
  const results: [TournamentResult | null, TournamentResult | null] = [...active.results];
  results[state.turnIndex] = result;
  if (state.turnIndex === 0) {
    return {
      ...state,
      game,
      phase: 'between-turns',
      matches: replaceMatch(state.matches, state.activeMatch, { ...active, results }),
    };
  }

  const firstSeed = active.players[0];
  const secondSeed = active.players[1];
  const firstResult = results[0];
  const secondResult = results[1];
  if (firstSeed === null || secondSeed === null || !firstResult || !secondResult) return state;
  const winnerSeed = winningSeed([firstSeed, secondSeed], [firstResult, secondResult]);
  const finishedMatch = { ...active, results, winnerSeed };
  let matches = replaceMatch(state.matches, state.activeMatch, finishedMatch);
  const plans = tournamentMatchPlans(state.playerCount);
  const targetIndex = plans.findIndex((plan) => plan.sources.includes(state.activeMatch));
  const targetPlan = plans[targetIndex];
  const target = matches[targetIndex];
  if (targetPlan && target) {
    const players: [number | null, number | null] = [...target.players];
    const slot = targetPlan.sources[0] === state.activeMatch ? 0 : 1;
    players[slot] = winnerSeed;
    matches = replaceMatch(matches, targetIndex, { ...target, players });
  }
  const isFinal = state.activeMatch === matches.length - 1;
  return { ...state, game, matches, phase: isFinal ? 'finished' : 'between-matches' };
}

export function nextTournamentTurn(state: TournamentState): TournamentState {
  if (state.phase !== 'between-turns') return state;
  const match = state.matches[state.activeMatch];
  return match
    ? { ...state, turnIndex: 1, phase: 'ready', game: createGame(match.boardCode) }
    : state;
}

export function nextTournamentMatch(state: TournamentState): TournamentState {
  if (state.phase !== 'between-matches') return state;
  const activeMatch = state.activeMatch + 1;
  const match = state.matches[activeMatch];
  return match && match.players[0] !== null && match.players[1] !== null
    ? { ...state, activeMatch, turnIndex: 0, phase: 'ready', game: createGame(match.boardCode) }
    : state;
}

export function toPastTournament(state: TournamentState): PastTournament | null {
  if (state.phase !== 'finished') return null;
  const final = state.matches[state.matches.length - 1];
  return final?.winnerSeed === null || final?.winnerSeed === undefined
    ? null
    : {
        playerCount: state.playerCount,
        players: state.players,
        matches: state.matches,
        championSeed: final.winnerSeed,
      };
}

function replaceMatch(
  matches: readonly TournamentMatch[],
  index: number,
  match: TournamentMatch,
): TournamentMatch[] {
  return matches.map((current, currentIndex) => (currentIndex === index ? match : current));
}
