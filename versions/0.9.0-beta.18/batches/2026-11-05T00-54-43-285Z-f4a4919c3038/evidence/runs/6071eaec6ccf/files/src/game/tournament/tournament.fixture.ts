import { boardCode } from '../deck.ts';
import { activateCard } from '../game.ts';
import { createTournament, nextTurn, recordTurn, startTurn, TournamentPhase } from './rules.ts';
import type { TournamentState } from './rules.ts';

export const TOURNAMENT_NAMES = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];

export function exampleTournament(count = 4, seed = 1): TournamentState {
  const sizes = count === 4 ? [6, 6, 8] : [4, 4, 4, 4, 6, 6, 8];
  return createTournament(
    TOURNAMENT_NAMES.slice(0, count),
    sizes.map((size, index) => boardCode(size, seed + index)),
  );
}

export function finishTurn(state: TournamentState): TournamentState {
  const started = startTurn(state);
  let game = started.game;
  if (!game) throw new Error('Expected a started tournament turn.');
  const deck = game.deck;
  for (let face = 0; face < deck.length / 2; face++) {
    game = activateCard(game, deck.indexOf(face));
    game = activateCard(game, deck.lastIndexOf(face));
  }
  return recordTurn(started, game);
}

export function finishedTournament(count = 4, seed = 1): TournamentState {
  let state = exampleTournament(count, seed);
  while (state.phase !== TournamentPhase.complete) state = nextTurn(finishTurn(state));
  return state;
}
