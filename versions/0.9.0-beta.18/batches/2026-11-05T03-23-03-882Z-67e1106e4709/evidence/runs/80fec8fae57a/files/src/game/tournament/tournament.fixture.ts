import { activateCard, createGame } from '../game.ts';
import { boardCode } from '../deck.ts';
import {
  createTournament,
  nextTournamentTurn,
  roundFor,
  startTournamentTurn,
  updateTournamentGame,
} from './rules.ts';
import { TournamentPhase } from './model.ts';
import type { TournamentState } from './model.ts';

export function tournamentFixture(count = 4, firstSeed = 1): TournamentState {
  return createTournament(
    Array.from({ length: count }, (_, index) => `Player ${index + 1}`),
    Array.from({ length: count - 1 }, (_, index) =>
      boardCode(roundFor(count, index).size, firstSeed + index),
    ),
  );
}

export function finishTournamentTurn(
  state: TournamentState,
  extraMoves = 0,
  elapsedMs = 1000,
): TournamentState {
  let game = createGame(state.game.boardCode);
  for (let face = 0; face < game.deck.length / 2; face += 1) {
    for (const [index, value] of game.deck.entries())
      if (value === face) game = activateCard(game, index);
  }
  return updateTournamentGame(startTournamentTurn(state), {
    ...game,
    moves: game.moves + extraMoves,
    elapsedMs,
  });
}

export function completedTournament(firstSeed = 1): TournamentState {
  let state = tournamentFixture(4, firstSeed);
  while (state.phase !== TournamentPhase.complete) {
    state = finishTournamentTurn(state);
    if (state.phase !== TournamentPhase.complete) state = nextTournamentTurn(state);
  }
  return state;
}
