import type { GameState } from '../game.ts';

export type TournamentPlayerCount = 4 | 8;
export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_FORMAT_VERSION = 1;
export type TournamentRound = 'Quarterfinal' | 'Semifinal' | 'Final';
export type TournamentPhase =
  | 'ready'
  | 'playing'
  | 'between-turns'
  | 'between-matches'
  | 'finished';

export interface TournamentPlayer {
  readonly name: string;
  readonly seed: number;
}

export interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly id: string;
  readonly number: number;
  readonly round: TournamentRound;
  readonly size: number;
  readonly boardCode: string;
  readonly players: readonly [number | null, number | null];
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly winnerSeed: number | null;
}

export interface TournamentState {
  readonly playerCount: TournamentPlayerCount;
  readonly players: readonly TournamentPlayer[];
  readonly matches: readonly TournamentMatch[];
  readonly activeMatch: number;
  readonly turnIndex: 0 | 1;
  readonly phase: TournamentPhase;
  readonly game: GameState;
}

export interface PastTournament {
  readonly playerCount: TournamentPlayerCount;
  readonly players: readonly TournamentPlayer[];
  readonly matches: readonly TournamentMatch[];
  readonly championSeed: number;
}

export interface TournamentSetup {
  readonly playerCount: TournamentPlayerCount;
  readonly names: readonly string[];
}

export type TournamentImport =
  | { readonly kind: 'setup'; readonly setup: TournamentSetup }
  | { readonly kind: 'tournament'; readonly tournament: TournamentState };
