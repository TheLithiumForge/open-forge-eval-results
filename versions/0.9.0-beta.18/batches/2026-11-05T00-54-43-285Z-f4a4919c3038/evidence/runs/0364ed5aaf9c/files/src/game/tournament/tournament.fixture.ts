import { activateCard } from '../game.ts';
import type { GameState } from '../game.ts';
import { createTournament, tournamentStages } from './rules.ts';

export function tournamentFixture(count = 4) {
  const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'].slice(0, count);
  return createTournament(
    names,
    tournamentStages(count).map((stage, index) => `np1-${stage.size}-${index + 1}`),
  );
}

export function wonTournamentGame(initial: GameState): GameState {
  let game = initial;
  for (let face = 0; face < game.deck.length / 2; face++)
    for (const [index, value] of game.deck.entries())
      if (value === face) game = activateCard(game, index);
  return game;
}
