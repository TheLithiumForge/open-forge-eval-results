import { boardCode } from '../deck.ts';
import { advanceTournament, createTournament, finishTournamentTurn } from './tournament.ts';
import type { TournamentState } from './tournament.ts';

export function sampleTournament(count = 4): TournamentState {
  return createTournament(
    Array.from({ length: count }, (_, index) => `Player ${index + 1}`),
    Array.from({ length: count - 1 }, (_, index) => boardCode(4, index + 1)),
    `example-${count}`,
  );
}

export function completedTournament(count = 4): TournamentState {
  let tournament = sampleTournament(count);
  while (tournament.phase !== 'complete') {
    tournament = advanceTournament(tournament);
    tournament = finishTournamentTurn(tournament, {
      moves: tournament.turn === 0 ? 9 : 8,
      elapsedMs: 2000,
    });
  }
  return tournament;
}
