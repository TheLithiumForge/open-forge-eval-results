import { parseBoardCode } from '../deck.ts';
import { nameError, normalizeName } from './names.ts';

export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  turnComplete: 'turn-complete',
  matchComplete: 'match-complete',
  complete: 'complete',
} as const;
type Phase = (typeof TournamentPhase)[keyof typeof TournamentPhase];
export interface TurnResult {
  readonly moves: number;
  readonly elapsedMs: number;
}
interface TournamentMatch {
  readonly round: string;
  readonly size: number;
  readonly boardCode: string;
  readonly players: readonly [number | null, number | null];
  readonly results: readonly [TurnResult | null, TurnResult | null];
  readonly winner: number | null;
}
export interface TournamentState {
  readonly players: readonly string[];
  readonly matches: readonly TournamentMatch[];
  readonly matchIndex: number;
  readonly turn: 0 | 1;
  readonly phase: Phase;
}

export function tournamentStages(count: number): readonly { round: string; size: number }[] {
  return count === 8
    ? [
        { round: 'Quarterfinal', size: 4 },
        { round: 'Semifinal', size: 6 },
        { round: 'Final', size: 8 },
      ]
    : [
        { round: 'Semifinal', size: 6 },
        { round: 'Final', size: 8 },
      ];
}

export function createTournament(
  names: readonly string[],
  codes: readonly string[],
): TournamentState {
  const players = names.map(normalizeName);
  if ((players.length !== 4 && players.length !== 8) || nameError(players))
    throw new Error('Invalid players.');
  if (codes.length !== players.length - 1 || new Set(codes).size !== codes.length)
    throw new Error('Invalid tournament deals.');
  const order = players.length === 4 ? [0, 3, 1, 2] : [0, 7, 3, 4, 2, 5, 1, 6];
  const matches: TournamentMatch[] = [];
  for (const [stageIndex, stage] of tournamentStages(players.length).entries()) {
    const count = players.length / 2 ** (stageIndex + 1);
    for (let index = 0; index < count; index += 1) {
      const code = codes[matches.length];
      if (!code || parseBoardCode(code)?.size !== stage.size)
        throw new Error('Invalid match deal.');
      matches.push({
        ...stage,
        boardCode: code,
        players:
          stageIndex === 0
            ? [order[index * 2] ?? null, order[index * 2 + 1] ?? null]
            : [null, null],
        results: [null, null],
        winner: null,
      });
    }
  }
  return { players, matches, matchIndex: 0, turn: 0, phase: TournamentPhase.ready };
}

export function matchWinner(match: TournamentMatch): number | null {
  const [left, right] = match.results;
  const [first, second] = match.players;
  if (!left || !right || first === null || second === null) return null;
  const comparison = left.moves - right.moves || left.elapsedMs - right.elapsedMs || first - second;
  return comparison <= 0 ? first : second;
}

export function recordTournamentResult(
  state: TournamentState,
  result: TurnResult,
): TournamentState {
  if (state.phase !== TournamentPhase.playing) return state;
  const matches = [...state.matches];
  const current = matches[state.matchIndex];
  if (!current) return state;
  const recorded = { moves: result.moves, elapsedMs: result.elapsedMs };
  const results: TournamentMatch['results'] =
    state.turn === 0 ? [recorded, null] : [current.results[0], recorded];
  const finished = { ...current, results };
  const winner = matchWinner(finished);
  matches[state.matchIndex] = { ...finished, winner };
  if (winner !== null && state.matchIndex < matches.length - 1) {
    const targetIndex = state.players.length / 2 + Math.floor(state.matchIndex / 2);
    const target = matches[targetIndex];
    if (target)
      matches[targetIndex] = {
        ...target,
        players:
          state.matchIndex % 2 === 0 ? [winner, target.players[1]] : [target.players[0], winner],
      };
  }
  const phase =
    state.turn === 0
      ? TournamentPhase.turnComplete
      : state.matchIndex === matches.length - 1
        ? TournamentPhase.complete
        : TournamentPhase.matchComplete;
  return { ...state, matches, phase };
}

export function nextTournamentTurn(state: TournamentState): TournamentState {
  if (state.phase === TournamentPhase.turnComplete)
    return { ...state, turn: 1, phase: TournamentPhase.ready };
  if (state.phase === TournamentPhase.matchComplete)
    return { ...state, matchIndex: state.matchIndex + 1, turn: 0, phase: TournamentPhase.ready };
  return state;
}
