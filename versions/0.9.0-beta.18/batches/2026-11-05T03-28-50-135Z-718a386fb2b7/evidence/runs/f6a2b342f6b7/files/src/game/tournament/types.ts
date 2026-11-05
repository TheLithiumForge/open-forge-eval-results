import type { GameState } from '../game.ts';
import type { TournamentMatch } from './pairing.ts';

export interface TournamentPlayer {
  readonly name: string;
  readonly seed: number;
}

export interface Tournament {
  readonly champion: TournamentPlayer | null;
  readonly currentMatch: number;
  readonly currentTurn: 0 | 1;
  readonly game: GameState | null;
  readonly matches: readonly TournamentMatch[];
  readonly playerCount: 4 | 8;
  readonly players: readonly TournamentPlayer[];
}
