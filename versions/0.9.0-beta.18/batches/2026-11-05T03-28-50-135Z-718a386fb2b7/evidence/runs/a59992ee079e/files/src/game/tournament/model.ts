export type RoundName = 'Quarterfinal' | 'Semifinal' | 'Final';
export type TournamentStatus = 'active' | 'finished';
export type TournamentAction = 'turn' | 'match' | null;

export interface TournamentPlayer {
  readonly name: string;
  readonly seed: number;
}

export interface TournamentResult {
  readonly elapsedMs: number;
  readonly moves: number;
}

export interface TournamentMatch {
  readonly id: string;
  readonly boardCode: string;
  readonly players: readonly [TournamentPlayer | null, TournamentPlayer | null];
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly winner: TournamentPlayer | null;
}

export interface TournamentRound {
  readonly matches: readonly TournamentMatch[];
  readonly name: RoundName;
  readonly size: number;
}

export interface Tournament {
  readonly champion: TournamentPlayer | null;
  readonly id: string;
  readonly matchIndex: number;
  readonly playerCount: 4 | 8;
  readonly playerIndex: 0 | 1;
  readonly players: readonly TournamentPlayer[];
  readonly roundIndex: number;
  readonly rounds: readonly TournamentRound[];
  readonly status: TournamentStatus;
}

export interface RoundDefinition {
  readonly count: number;
  readonly name: RoundName;
  readonly size: number;
}
