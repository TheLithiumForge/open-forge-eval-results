import { createGame } from '../game.ts';
import { advanceTournament, beginTurn, createTournament, finishTurn } from './rules.ts';
import type { TournamentState } from './rules.ts';
import type { GameState } from '../game.ts';

export function tournamentFixture(count: 4 | 8 = 4, offset = 0): TournamentState {
  const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'].slice(0, count);
  const sizes = count === 4 ? [6, 6, 8] : [4, 4, 4, 4, 6, 6, 8];
  return createTournament(
    names,
    sizes.map((size, index) => `np1-${size}-${offset + index + 101}`),
  );
}

export function wonTournamentGame(code: string): GameState {
  const game = createGame(code);
  return {
    ...game,
    matched: game.deck.map((_, index) => index),
    moves: game.deck.length / 2,
    started: true,
  };
}

export function completedTournament(count: 4 | 8 = 4, offset = 0): TournamentState {
  let tournament = tournamentFixture(count, offset);
  for (const match of tournament.matches) {
    for (let turn = 0; turn < 2; turn += 1) {
      tournament = finishTurn(beginTurn(tournament), wonTournamentGame(match.boardCode));
      tournament = advanceTournament(tournament);
    }
  }
  return tournament;
}
