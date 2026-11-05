import { createGame, isWon } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { TournamentPhase } from './model.ts';
import { normalizePlayerName, playerNamesError } from './names.ts';
import { tournamentRound } from './pairing.ts';
import type { GameState } from '../game.ts';
import type { TournamentState } from './model.ts';

export function tournamentSetup(names: readonly string[] = ['', '', '', '']): TournamentState {
  return { phase: TournamentPhase.setup, names, matches: [], game: null };
}

export function startTournament(
  names: readonly string[],
  codes: readonly string[],
): TournamentState | null {
  if ((names.length !== 4 && names.length !== 8) || playerNamesError(names)) return null;
  if (codes.length !== names.length - 1 || new Set(codes).size !== codes.length) return null;
  if (
    codes.some(
      (code, index) => parseBoardCode(code)?.size !== tournamentRound(names.length, index).size,
    )
  )
    return null;
  const code = codes[0];
  if (!code) return null;
  return {
    phase: TournamentPhase.ready,
    names: names.map(normalizePlayerName),
    matches: codes.map((boardCode) => ({ boardCode, results: [] })),
    game: createGame(code),
  };
}

export function startTournamentTurn(state: TournamentState): TournamentState {
  return state.phase === TournamentPhase.ready
    ? { ...state, phase: TournamentPhase.playing }
    : state;
}

export function finishTournamentTurn(state: TournamentState, game: GameState): TournamentState {
  const index = state.matches.findIndex((match) => match.results.length < 2);
  const match = state.matches[index];
  if (
    state.phase !== TournamentPhase.playing ||
    !match ||
    match.boardCode !== game.boardCode ||
    !isWon(game)
  )
    return state;
  const results = [...match.results, { moves: game.moves, elapsedMs: game.elapsedMs }];
  const phase =
    results.length === 1
      ? TournamentPhase.turnEnd
      : index === state.matches.length - 1
        ? TournamentPhase.complete
        : TournamentPhase.matchEnd;
  return {
    ...state,
    phase,
    game,
    matches: state.matches.map((value, position) =>
      position === index ? { ...match, results } : value,
    ),
  };
}

export function nextTournamentTurn(state: TournamentState): TournamentState {
  if (state.phase !== TournamentPhase.turnEnd && state.phase !== TournamentPhase.matchEnd)
    return state;
  const match = state.matches.find((value) => value.results.length < 2);
  return match
    ? { ...state, phase: TournamentPhase.ready, game: createGame(match.boardCode) }
    : state;
}
