import type { GameState } from '../game.ts';

export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  turnComplete: 'turnComplete',
  matchComplete: 'matchComplete',
  complete: 'complete',
} as const;

export interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly players: readonly number[];
  readonly results: readonly TournamentResult[];
  readonly winner: number | null;
}

export interface TournamentState {
  readonly names: readonly string[];
  readonly matches: readonly TournamentMatch[];
  readonly currentMatch: number;
  readonly phase: (typeof TournamentPhase)[keyof typeof TournamentPhase];
  readonly game: GameState;
}

export interface TournamentSetup {
  readonly count: 4 | 8;
  readonly names: readonly string[];
}

export interface TournamentDocument {
  readonly setup: TournamentSetup | null;
  readonly tournament: TournamentState | null;
}
