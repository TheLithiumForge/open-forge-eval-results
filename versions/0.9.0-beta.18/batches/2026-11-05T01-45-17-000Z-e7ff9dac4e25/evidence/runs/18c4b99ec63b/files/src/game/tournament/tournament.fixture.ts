import { boardCode } from '../deck.ts';
import { createTournament, recordTurn } from './tournament.ts';
import type { Tournament, TurnResult } from './tournament.ts';

export const FOUR_PLAYERS = ['Ann', 'Ben', 'Cy', 'Dee'];
export const EIGHT_PLAYERS = [...FOUR_PLAYERS, 'Eve', 'Fay', 'Gus', 'Hal'];

// Each match has its own 4x4 deal.
export function dealCodes(count: number): string[] {
  return Array.from({ length: count }, (_, index) => boardCode(4, index + 1));
}

export function newTournament(players: readonly string[]): Tournament {
  return createTournament(players, dealCodes(players.length - 1));
}

export function turn(moves: number, elapsedMs = 1000): TurnResult {
  return { moves, elapsedMs };
}

export function playTurns(tournament: Tournament, results: readonly TurnResult[]): Tournament {
  return results.reduce(recordTurn, tournament);
}

// Every match goes to its first player, who needs 8 moves against 9.
export function firstPlayersWin(tournament: Tournament): Tournament {
  const turns = tournament.matches.flatMap(() => [turn(8), turn(9)]);
  return playTurns(tournament, turns);
}
