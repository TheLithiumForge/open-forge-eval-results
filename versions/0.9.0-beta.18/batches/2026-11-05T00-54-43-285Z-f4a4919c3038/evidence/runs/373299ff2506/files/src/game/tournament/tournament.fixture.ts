import { createGame } from '../game.ts';
import {
  advanceTournament,
  createTournament,
  finishTournamentTurn,
  startTournamentTurn,
} from './tournament.ts';
import type { Tournament } from './tournament.ts';
import type { TournamentDocument } from './tournament-document.ts';

export function sampleTournament(count = 4): Tournament {
  return createTournament(
    'local-tournament',
    ['Ada', 'Bo', 'Cy', 'Dee', 'Eli', 'Flo', 'Gia', 'Hal'].slice(0, count),
    Array.from({ length: count - 1 }, (_, index) => `np1-4-${index + 1}`),
  );
}

export function completeSampleTurn(
  tournament: Tournament,
  moves = 8,
  elapsedMs = 1000,
): Tournament {
  const playing = startTournamentTurn(advanceTournament(tournament));
  const code = playing.game?.boardCode;
  if (!code) throw new Error('Expected a turn in progress.');
  const game = createGame(code);
  return finishTournamentTurn(playing, {
    ...game,
    matched: game.deck.map((_, index) => index),
    moves,
    elapsedMs,
    started: true,
  });
}

export function sampleDocument(tournament: Tournament | null): TournamentDocument {
  return {
    setup: { playerCount: 4, names: Array.from({ length: 8 }, () => ''), size: 4 },
    tournament,
    pastTournaments: [],
  };
}
