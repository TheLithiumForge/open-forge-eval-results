export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  turnComplete: 'turn-complete',
  matchComplete: 'match-complete',
  complete: 'complete',
} as const;

export interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly results: readonly TournamentResult[];
}

export interface Tournament {
  readonly players: readonly string[];
  readonly matches: readonly TournamentMatch[];
  readonly matchIndex: number;
  readonly turn: number;
  readonly phase: (typeof TournamentPhase)[keyof typeof TournamentPhase];
}

export interface TournamentSetup {
  readonly count: number;
  readonly names: readonly string[];
}
