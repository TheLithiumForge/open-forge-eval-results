import { createGame, isWon } from '../game.ts';
import type { GameState } from '../game.ts';

export const TournamentPhase = {
  setup: 'setup',
  ready: 'ready',
  playing: 'playing',
  result: 'result',
  complete: 'complete',
} as const;
type Phase = (typeof TournamentPhase)[keyof typeof TournamentPhase];
export interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface TournamentMatch {
  readonly boardCode: string;
  readonly results: readonly TournamentResult[];
}
export interface TournamentState {
  readonly names: readonly string[];
  readonly matches: readonly TournamentMatch[];
  readonly matchIndex: number;
  readonly phase: Phase;
  readonly game: GameState | null;
}

export function tournamentDraft(count = 4): TournamentState {
  return {
    names: Array.from({ length: count }, () => ''),
    matches: [],
    matchIndex: 0,
    phase: TournamentPhase.setup,
    game: null,
  };
}

export function normalizedNames(names: readonly string[]): string[] {
  return names.map((name) => name.trim().replace(/\s+/gu, ' ').normalize('NFC'));
}

export function nameProblem(names: readonly string[]): string {
  const accepted = normalizedNames(names);
  if (accepted.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(accepted.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return '';
}

export function roundFor(count: number, index: number): { name: string; size: number } {
  if (index === count - 2) return { name: 'Final', size: 8 };
  if (count === 8 && index < 4) return { name: 'Quarterfinal', size: 4 };
  return { name: 'Semifinal', size: 6 };
}

export function createTournament(
  names: readonly string[],
  codes: readonly string[],
): TournamentState {
  return {
    names: normalizedNames(names),
    matches: codes.map((boardCode) => ({ boardCode, results: [] })),
    matchIndex: 0,
    phase: TournamentPhase.ready,
    game: null,
  };
}

export function matchPlayers(state: TournamentState, index: number): readonly number[] {
  const opening =
    state.names.length === 4
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
  if (index < opening.length) return opening[index] ?? [];
  const previous = (index - opening.length) * 2;
  const first = matchWinner(state, previous);
  const second = matchWinner(state, previous + 1);
  return first === null || second === null ? [] : [first, second];
}

export function matchWinner(state: TournamentState, index: number): number | null {
  const results = state.matches[index]?.results;
  if (!results || results.length !== 2) return null;
  const [first, second] = results;
  const [a, b] = matchPlayers(state, index);
  if (!first || !second || a === undefined || b === undefined) return null;
  const difference = first.moves - second.moves || first.elapsedMs - second.elapsedMs || a - b;
  return difference <= 0 ? a : b;
}

export function startTurn(state: TournamentState): TournamentState {
  const match = state.matches[state.matchIndex];
  if (state.phase !== TournamentPhase.ready || !match) return state;
  return { ...state, phase: TournamentPhase.playing, game: createGame(match.boardCode) };
}

export function recordTurn(state: TournamentState, game: GameState): TournamentState {
  const match = state.matches[state.matchIndex];
  if (state.phase !== TournamentPhase.playing || !match || game.boardCode !== match.boardCode)
    return state;
  if (!isWon(game)) return { ...state, game };
  const results = [...match.results, { moves: game.moves, elapsedMs: game.elapsedMs }];
  const matches = state.matches.map((item, index) =>
    index === state.matchIndex ? { ...item, results } : item,
  );
  const complete = state.matchIndex === matches.length - 1 && results.length === 2;
  return {
    ...state,
    matches,
    game: null,
    phase: complete ? TournamentPhase.complete : TournamentPhase.result,
  };
}

export function nextTurn(state: TournamentState): TournamentState {
  if (state.phase !== TournamentPhase.result) return state;
  const finished = state.matches[state.matchIndex]?.results.length === 2;
  return {
    ...state,
    matchIndex: state.matchIndex + (finished ? 1 : 0),
    phase: TournamentPhase.ready,
    game: null,
  };
}
