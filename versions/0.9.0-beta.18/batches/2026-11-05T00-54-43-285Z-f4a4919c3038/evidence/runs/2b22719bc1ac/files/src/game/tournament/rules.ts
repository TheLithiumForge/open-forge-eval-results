import { parseBoardCode } from '../deck.ts';
import { normalizeName, nameError } from './names.ts';

export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  turnDone: 'turnDone',
  matchDone: 'matchDone',
  complete: 'complete',
} as const;
type Phase = (typeof TournamentPhase)[keyof typeof TournamentPhase];
export interface Result {
  readonly moves: number;
  readonly elapsedMs: number;
}
interface Match {
  readonly boardCode: string;
  readonly players: readonly number[];
  readonly results: readonly Result[];
  readonly winner: number | null;
}
export interface TournamentState {
  readonly players: readonly string[];
  readonly matches: readonly Match[];
  readonly matchIndex: number;
  readonly phase: Phase;
}

export function matchRound(count: number, index: number) {
  const quarterfinals = count === 8 ? 4 : 0;
  if (index < quarterfinals) return { name: 'Quarterfinal', size: 4 };
  if (index < quarterfinals + 2) return { name: 'Semifinal', size: 6 };
  return { name: 'Final', size: 8 };
}

export function createTournament(
  names: readonly string[],
  codes: readonly string[],
): TournamentState {
  if ((names.length !== 4 && names.length !== 8) || nameError(names))
    throw new Error('Invalid tournament players.');
  if (
    codes.length !== names.length - 1 ||
    new Set(codes).size !== codes.length ||
    codes.some((code, i) => parseBoardCode(code)?.size !== matchRound(names.length, i).size)
  )
    throw new Error('Invalid tournament deals.');
  const pairings =
    names.length === 4
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
  return {
    players: names.map(normalizeName),
    matchIndex: 0,
    phase: TournamentPhase.ready,
    matches: codes.map((boardCode, index) => ({
      boardCode,
      players: pairings[index] ?? [],
      results: [],
      winner: null,
    })),
  };
}

export function startTurn(state: TournamentState): TournamentState {
  return state.phase === TournamentPhase.ready
    ? { ...state, phase: TournamentPhase.playing }
    : state;
}

export function finishTurn(state: TournamentState, result: Result): TournamentState {
  const match = state.matches[state.matchIndex];
  if (state.phase !== TournamentPhase.playing || !match) return state;
  const results = [...match.results, result];
  const first = results[0];
  const second = results[1];
  let winner: number | null = null;
  if (first && second) {
    const a = match.players[0];
    const b = match.players[1];
    if (a === undefined || b === undefined) return state;
    const comparison = first.moves - second.moves || first.elapsedMs - second.elapsedMs || a - b;
    winner = comparison <= 0 ? a : b;
  }
  const matches = state.matches.map((entry, i) =>
    i === state.matchIndex ? { ...match, results, winner } : entry,
  );
  if (winner !== null) {
    const opening = state.players.length / 2;
    const destination = opening + Math.floor(state.matchIndex / 2);
    const next = matches[destination];
    if (next) matches[destination] = { ...next, players: [...next.players, winner] };
  }
  return {
    ...state,
    matches,
    phase:
      winner === null
        ? TournamentPhase.turnDone
        : state.matchIndex === matches.length - 1
          ? TournamentPhase.complete
          : TournamentPhase.matchDone,
  };
}

export function nextTurn(state: TournamentState): TournamentState {
  return state.phase === TournamentPhase.turnDone
    ? { ...state, phase: TournamentPhase.ready }
    : state;
}

export function nextMatch(state: TournamentState): TournamentState {
  return state.phase === TournamentPhase.matchDone
    ? { ...state, matchIndex: state.matchIndex + 1, phase: TournamentPhase.ready }
    : state;
}

export function turnIndex(state: TournamentState): number {
  const length = state.matches[state.matchIndex]?.results.length ?? 0;
  return state.phase === TournamentPhase.ready || state.phase === TournamentPhase.playing
    ? length
    : length - 1;
}
