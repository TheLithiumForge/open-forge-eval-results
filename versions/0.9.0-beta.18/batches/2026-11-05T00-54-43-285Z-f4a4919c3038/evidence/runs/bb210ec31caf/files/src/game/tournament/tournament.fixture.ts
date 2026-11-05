import { activateCard, createGame } from '../game.ts';
import {
  createTournament,
  nextTournamentTurn,
  recordTournamentResult,
  TournamentPhase,
} from './rules.ts';
import type { GameState } from '../game.ts';
import type { TournamentArchive } from './format.ts';

export const FOUR_NAMES = ['Ada', 'Bo', 'Cora', 'Dev'];
export const FOUR_CODES = ['np1-6-1', 'np1-6-2', 'np1-8-3'];
export const EIGHT_NAMES = [...FOUR_NAMES, 'Emi', 'Finn', 'Gia', 'Hal'];
export const EIGHT_CODES = [
  'np1-4-1',
  'np1-4-2',
  'np1-4-3',
  'np1-4-4',
  'np1-6-5',
  'np1-6-6',
  'np1-8-7',
];

export function completedGame(code: string): GameState {
  let game = createGame(code);
  for (let face = 0; face < game.deck.length / 2; face += 1)
    for (const [index, card] of game.deck.entries())
      if (card === face) game = activateCard(game, index);
  return game;
}

export function completedTournament(seed = 1): TournamentArchive {
  const codes = [`np1-6-${seed}`, `np1-6-${seed + 1}`, `np1-8-${seed + 2}`];
  let tournament = createTournament(FOUR_NAMES, codes);
  let game = completedGame(codes[0] ?? 'np1-6-1');
  while (tournament.phase !== TournamentPhase.complete) {
    tournament = nextTournamentTurn(tournament);
    const match = tournament.matches[tournament.matchIndex];
    if (!match) throw new Error('Missing match.');
    game = completedGame(match.boardCode);
    tournament = recordTournamentResult({ ...tournament, phase: TournamentPhase.playing }, game);
  }
  return { tournament, game };
}
