import type { GameState } from '../game.ts';

export type PlayerCount = 4 | 8;
export type RoundName = 'Quarterfinal' | 'Semifinal' | 'Final';

export interface TournamentPlayer {
  readonly name: string;
  readonly seed: number;
}

export interface MatchResult {
  readonly elapsedMs: number;
  readonly moves: number;
  readonly playerSeed: number;
}

export type MatchPlayers = readonly [number | null, number | null];
export type MatchResults = readonly [MatchResult | null, MatchResult | null];

export interface TournamentMatch {
  readonly boardCode: string;
  readonly players: MatchPlayers;
  readonly results: MatchResults;
  readonly winnerSeed: number | null;
}

export interface TournamentRound {
  readonly matches: readonly TournamentMatch[];
  readonly name: RoundName;
  readonly size: number;
}

export interface TournamentRecord {
  readonly playerCount: PlayerCount;
  readonly players: readonly TournamentPlayer[];
  readonly rounds: readonly TournamentRound[];
}

export interface TournamentState extends TournamentRecord {
  readonly currentGame: GameState | null;
  readonly currentMatch: number;
  readonly currentRound: number;
  readonly currentTurn: 0 | 1;
  readonly status: 'playing' | 'complete';
}
