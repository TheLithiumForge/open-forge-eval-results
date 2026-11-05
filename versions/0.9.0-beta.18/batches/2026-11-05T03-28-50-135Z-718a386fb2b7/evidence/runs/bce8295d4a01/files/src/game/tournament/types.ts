export type Round = 'Quarterfinal' | 'Semifinal' | 'Final';

export interface TournamentPlayer {
  readonly name: string;
  readonly seed: number;
}

export interface TurnResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly next: { readonly matchIndex: number; readonly playerSlot: 0 | 1 } | null;
  readonly players: readonly [number | null, number | null];
  readonly results: readonly [TurnResult | null, TurnResult | null];
  readonly round: Round;
  readonly winnerSeed: number | null;
}

export interface TournamentState {
  readonly activePlayer: 0 | 1;
  readonly championSeed: number | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly currentGame: string | null;
  readonly currentMatchIndex: number;
  readonly matches: readonly TournamentMatch[];
  readonly phase: 'ready' | 'playing' | 'betweenTurns' | 'betweenMatches' | 'complete';
  readonly playerCount: 4 | 8;
  readonly players: readonly TournamentPlayer[];
}
