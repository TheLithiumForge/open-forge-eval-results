import type { GameState } from '../game.ts';

export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  turnFinished: 'turn-finished',
  matchFinished: 'match-finished',
  complete: 'complete',
} as const;

export interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
}

export interface TournamentState {
  readonly players: readonly string[];
  readonly matches: readonly TournamentMatch[];
  readonly matchIndex: number;
  readonly turn: 0 | 1;
  readonly phase: (typeof TournamentPhase)[keyof typeof TournamentPhase];
  readonly game: GameState;
}

export interface TournamentDocument {
  readonly setup: readonly string[] | null;
  readonly tournament: TournamentState | null;
}
