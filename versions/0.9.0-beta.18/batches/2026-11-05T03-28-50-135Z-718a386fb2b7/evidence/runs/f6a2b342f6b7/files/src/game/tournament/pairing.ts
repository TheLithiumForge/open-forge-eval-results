import type { TournamentPlayer } from './types.ts';

export type TournamentRound = 'Quarterfinal' | 'Semifinal' | 'Final';

export interface TournamentMatch {
  readonly boardCode: string;
  readonly players: readonly [TournamentPlayer | null, TournamentPlayer | null];
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly round: TournamentRound;
  readonly winner: TournamentPlayer | null;
}

export interface TournamentResult {
  readonly elapsedMs: number;
  readonly moves: number;
}

interface MatchPlan {
  readonly boardSize: number;
  readonly players: readonly [TournamentPlayer | null, TournamentPlayer | null];
  readonly round: TournamentRound;
}

export function tournamentPlan(players: readonly TournamentPlayer[]): readonly MatchPlan[] {
  const player = (seed: number): TournamentPlayer | null =>
    players.find((entry) => entry.seed === seed) ?? null;
  if (players.length === 4) {
    return [
      { boardSize: 6, players: [player(1), player(4)], round: 'Semifinal' },
      { boardSize: 6, players: [player(2), player(3)], round: 'Semifinal' },
      { boardSize: 8, players: [null, null], round: 'Final' },
    ];
  }
  return [
    { boardSize: 4, players: [player(1), player(8)], round: 'Quarterfinal' },
    { boardSize: 4, players: [player(4), player(5)], round: 'Quarterfinal' },
    { boardSize: 4, players: [player(3), player(6)], round: 'Quarterfinal' },
    { boardSize: 4, players: [player(2), player(7)], round: 'Quarterfinal' },
    { boardSize: 6, players: [null, null], round: 'Semifinal' },
    { boardSize: 6, players: [null, null], round: 'Semifinal' },
    { boardSize: 8, players: [null, null], round: 'Final' },
  ];
}
