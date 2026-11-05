import type { GameState } from '../game.ts';

export const TournamentPhase = {
  setup: 'setup',
  ready: 'ready',
  playing: 'playing',
  turnEnd: 'turnEnd',
  matchEnd: 'matchEnd',
  complete: 'complete',
} as const;
export type TournamentPhase = (typeof TournamentPhase)[keyof typeof TournamentPhase];

export interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly results: readonly TournamentResult[];
}

export interface TournamentState {
  readonly phase: TournamentPhase;
  readonly names: readonly string[];
  readonly matches: readonly TournamentMatch[];
  readonly game: GameState | null;
}
