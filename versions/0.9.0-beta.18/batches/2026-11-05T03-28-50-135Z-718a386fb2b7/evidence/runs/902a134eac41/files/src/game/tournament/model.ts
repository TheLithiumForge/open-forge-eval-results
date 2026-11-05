import type { GameState } from '../game.ts';

export type TournamentPhase = 'ready' | 'playing' | 'nextTurn' | 'nextMatch' | 'finished';

export interface TournamentPlayer {
  readonly seed: number;
  readonly name: string;
}

export interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly players: readonly [number | null, number | null];
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly winnerSeed: number | null;
}

export interface TournamentRound {
  readonly name: 'Quarterfinal' | 'Semifinal' | 'Final';
  readonly size: number;
  readonly matches: readonly TournamentMatch[];
}

export interface TournamentRecord {
  readonly startedAtMs: number;
  readonly completedAtMs: number;
  readonly players: readonly TournamentPlayer[];
  readonly rounds: readonly TournamentRound[];
  readonly championSeed: number;
}

export interface TournamentState {
  readonly startedAtMs: number;
  readonly completedAtMs: number | null;
  readonly players: readonly TournamentPlayer[];
  readonly rounds: readonly TournamentRound[];
  readonly currentRound: number;
  readonly currentMatch: number;
  readonly currentTurn: 0 | 1;
  readonly phase: TournamentPhase;
  readonly championSeed: number | null;
  readonly game: GameState;
  readonly generation: number;
  readonly paused: boolean;
}
