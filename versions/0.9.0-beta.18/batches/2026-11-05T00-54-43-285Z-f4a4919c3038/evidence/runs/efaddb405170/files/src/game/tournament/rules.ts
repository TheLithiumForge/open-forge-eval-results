import { createGame, isWon } from '../game.ts';
import type { GameState } from '../game.ts';

export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  turnResult: 'turn-result',
  matchResult: 'match-result',
  complete: 'complete',
} as const;
type Phase = (typeof TournamentPhase)[keyof typeof TournamentPhase];
export interface TurnResult {
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface TournamentMatch {
  readonly boardCode: string;
  readonly results: readonly TurnResult[];
}
export interface TournamentState {
  readonly players: readonly string[];
  readonly matches: readonly TournamentMatch[];
  readonly currentMatch: number;
  readonly phase: Phase;
  readonly game: GameState | null;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function validateNames(
  drafts: readonly string[],
): { names: readonly string[]; error?: never } | { error: string; names?: never } {
  const names = drafts.map(normalizeName);
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return { error: 'Use 2 to 20 characters.' };
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return { error: 'Each name must be different.' };
  return { names };
}

export function matchStage(count: number, index: number) {
  if (count === 8 && index < 4) return { round: 'Quarterfinal', size: 4 };
  if (index < count - 2) return { round: 'Semifinal', size: 6 };
  return { round: 'Final', size: 8 };
}

export function createTournament(
  players: readonly string[],
  codes: readonly string[],
): TournamentState {
  return {
    players: [...players],
    matches: codes.map((boardCode) => ({ boardCode, results: [] })),
    currentMatch: 0,
    phase: TournamentPhase.ready,
    game: null,
  };
}

export function matchPlayers(state: TournamentState, index: number): readonly (number | null)[] {
  const count = state.players.length;
  const opening =
    count === 4
      ? [
          [0, 3],
          [1, 2],
        ]
      : [
          [0, 7],
          [3, 4],
          [2, 5],
          [1, 6],
        ];
  if (index < count / 2) return opening[index] ?? [null, null];
  const previous = 2 * (index - count / 2);
  return [matchWinner(state, previous), matchWinner(state, previous + 1)];
}

export function matchWinner(state: TournamentState, index: number): number | null {
  const results = state.matches[index]?.results;
  const [first, second] = results ?? [];
  const [left, right] = matchPlayers(state, index);
  if (!first || !second || left == null || right == null) return null;
  const difference =
    first.moves - second.moves || first.elapsedMs - second.elapsedMs || left - right;
  return difference <= 0 ? left : right;
}

export function startTurn(state: TournamentState): TournamentState {
  const match = state.matches[state.currentMatch];
  if (state.phase !== TournamentPhase.ready || !match) return state;
  return {
    ...state,
    phase: TournamentPhase.playing,
    game: state.game ?? createGame(match.boardCode),
  };
}

export function recordGame(state: TournamentState, game: GameState): TournamentState {
  const match = state.matches[state.currentMatch];
  if (state.phase !== TournamentPhase.playing || !match || game.boardCode !== match.boardCode)
    return state;
  if (!isWon(game)) return { ...state, game };
  const results = [...match.results, { moves: game.moves, elapsedMs: game.elapsedMs }];
  const phase =
    results.length === 1
      ? TournamentPhase.turnResult
      : state.currentMatch === state.matches.length - 1
        ? TournamentPhase.complete
        : TournamentPhase.matchResult;
  return {
    ...state,
    game,
    phase,
    matches: state.matches.map((entry, index) =>
      index === state.currentMatch ? { ...entry, results } : entry,
    ),
  };
}

export function advanceTournament(state: TournamentState): TournamentState {
  if (state.phase === TournamentPhase.turnResult)
    return { ...state, phase: TournamentPhase.ready, game: null };
  if (state.phase === TournamentPhase.matchResult)
    return {
      ...state,
      currentMatch: state.currentMatch + 1,
      phase: TournamentPhase.ready,
      game: null,
    };
  return state;
}
