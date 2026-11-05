import { createTournament, recordResult } from './rules.ts';
import type { Tournament, TurnResult } from './types.ts';

export const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'] as const;
export const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'] as const;
// Literal codes whose sizes follow the rounds: 4x4 quarterfinals, 6x6 semifinals, an 8x8 final.
const EIGHT_CODES = [
  'np1-4-11',
  'np1-4-12',
  'np1-4-13',
  'np1-4-14',
  'np1-6-21',
  'np1-6-22',
  'np1-8-31',
] as const;
export const FOUR_CODES = ['np1-6-21', 'np1-6-22', 'np1-8-31'] as const;

// A result that wins on moves alone. Smaller numbers are better.
export function turn(moves: number, elapsedMs = 60_000): TurnResult {
  return { moves, elapsedMs };
}

// Records the given results in play order, two per match.
function played(tournament: Tournament, results: readonly TurnResult[]): Tournament {
  return results.reduce((state, result) => recordResult(state, result), tournament);
}

export function fourPlayers(results: readonly TurnResult[] = []): Tournament {
  return played(createTournament(FOUR, FOUR_CODES), results);
}

export function eightPlayers(results: readonly TurnResult[] = []): Tournament {
  return played(createTournament(EIGHT, EIGHT_CODES), results);
}
