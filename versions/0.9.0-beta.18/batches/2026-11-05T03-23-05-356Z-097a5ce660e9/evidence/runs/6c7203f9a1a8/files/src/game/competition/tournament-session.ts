import { advanceGame } from '../game.ts';
import type { ClockSession } from '../session/use-game-clock.ts';
import type { GameState } from '../game.ts';
import type { TournamentSetup } from './format-validation.ts';
import type { Tournament } from './rules.ts';

export interface TournamentSession extends ClockSession {
  readonly game: GameState | null;
  readonly tournament: Tournament | null;
}

export function emptyTournamentSession(generation = 0): TournamentSession {
  return { game: null, generation, paused: false, tournament: null };
}

export function tickTournament(
  session: TournamentSession,
  generation: number,
  milliseconds: number,
): TournamentSession {
  if (session.generation !== generation || session.tournament?.phase !== 'playing' || !session.game)
    return session;
  const game = advanceGame(session.game, milliseconds);
  return game === session.game ? session : { ...session, game };
}

export function completedSetup(tournament: Tournament): TournamentSetup {
  return {
    playerCount: tournament.playerCount,
    players: [
      ...tournament.players,
      ...Array.from({ length: 8 - tournament.playerCount }, () => ''),
    ],
  };
}
