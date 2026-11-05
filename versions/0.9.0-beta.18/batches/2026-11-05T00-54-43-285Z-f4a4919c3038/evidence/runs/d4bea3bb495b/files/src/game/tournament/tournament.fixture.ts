import { advanceGame } from '../game.ts';
import { playTournamentCard, startTournamentTurn } from './rules.ts';
import type { TournamentState } from './model.ts';

export const TOURNAMENT_NAMES = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];

export function finishTournamentTurn(tournament: TournamentState): TournamentState {
  let next = startTournamentTurn(tournament);
  const pairs = new Map<number, number[]>();
  next.game.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
  for (const indices of pairs.values())
    for (const index of indices) {
      next = { ...next, game: advanceGame(next.game, 0.5) };
      next = playTournamentCard(next, index);
    }
  return next;
}
