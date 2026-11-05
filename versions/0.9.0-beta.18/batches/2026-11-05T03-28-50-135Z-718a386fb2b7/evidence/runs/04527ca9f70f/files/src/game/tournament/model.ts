import type { GameState } from '../game.ts';

export type TournamentRound = 'Quarterfinal' | 'Semifinal' | 'Final';
export interface TournamentPlayer {
  readonly name: string;
  readonly seed: number;
}
export interface TournamentResult {
  readonly seed: number;
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface TournamentMatch {
  readonly round: TournamentRound;
  readonly matchNumber: number;
  readonly size: number;
  readonly boardCode: string;
  readonly playerSeeds: readonly [number | null, number | null];
  readonly feeders: readonly [number, number] | null;
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly winnerSeed: number | null;
}
export interface TournamentState {
  readonly status: 'active' | 'finished';
  readonly players: readonly TournamentPlayer[];
  readonly matches: readonly TournamentMatch[];
  readonly currentMatch: number;
  readonly currentTurn: 0 | 1;
  readonly activeGame: GameState | null;
  readonly turnRunning: boolean;
  readonly championSeed: number | null;
}
export interface TournamentRecord {
  readonly status: 'finished';
  readonly players: readonly TournamentPlayer[];
  readonly matches: readonly TournamentMatch[];
  readonly currentMatch: number;
  readonly currentTurn: 0 | 1;
  readonly championSeed: number;
}
export type TournamentImport =
  | { readonly kind: 'event'; readonly state: TournamentState }
  | { readonly kind: 'setup'; readonly count: number; readonly names: readonly string[] };

export function normalizePlayerName(draft: string): string {
  return draft.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function acceptedNames(drafts: readonly string[], count: number): string[] | null {
  const names = drafts.slice(0, count).map(normalizePlayerName);
  if (
    names.some((name) => {
      const length = Array.from(name).length;
      return length < 2 || length > 20;
    })
  )
    return null;
  const keys = names.map((name) => name.toLowerCase());
  return new Set(keys).size === count ? names : null;
}

export function recordOf(state: TournamentState): TournamentRecord | null {
  if (state.status !== 'finished' || state.championSeed === null) return null;
  const { status, players, matches, currentMatch, currentTurn, championSeed } = state;
  return { status, players, matches, currentMatch, currentTurn, championSeed };
}

export function playerName(state: Pick<TournamentState, 'players'>, seed: number | null): string {
  return state.players.find((player) => player.seed === seed)?.name ?? 'TBD';
}
