import { createGame, isWon } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { normalizeName, nameError } from './names.ts';
import { TournamentPhase } from './model.ts';
import type { GameState } from '../game.ts';
import type { TournamentState } from './model.ts';

const OPENING_FOUR = [
  [1, 4],
  [2, 3],
] as const;
const OPENING_EIGHT = [
  [1, 8],
  [4, 5],
  [3, 6],
  [2, 7],
] as const;

export function roundFor(players: number, index: number): { name: string; size: number } {
  const remaining = players - 1 - index;
  if (remaining === 1) return { name: 'Final', size: 8 };
  if (remaining <= 3) return { name: 'Semifinal', size: 6 };
  return { name: 'Quarterfinal', size: 4 };
}

export function matchPlayers(
  tournament: Pick<TournamentState, 'players' | 'matches'>,
  index: number,
): readonly [number | null, number | null] {
  const opening = tournament.players.length === 4 ? OPENING_FOUR : OPENING_EIGHT;
  const pair = opening[index];
  if (pair) return pair;
  const child = 2 * (index - opening.length);
  return [matchWinner(tournament, child), matchWinner(tournament, child + 1)];
}

export function matchWinner(
  tournament: Pick<TournamentState, 'players' | 'matches'>,
  index: number,
): number | null {
  const match = tournament.matches[index];
  if (!match) return null;
  const [first, second] = match.results;
  if (!first || !second) return null;
  const [left, right] = matchPlayers(tournament, index);
  if (left === null || right === null) return null;
  const difference =
    first.moves - second.moves || first.elapsedMs - second.elapsedMs || left - right;
  return difference <= 0 ? left : right;
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
    codes.some((code, index) => parseBoardCode(code)?.size !== roundFor(names.length, index).size)
  )
    throw new Error('Invalid tournament deals.');
  const matches = codes.map((boardCode) => ({ boardCode, results: [null, null] as const }));
  const first = matches[0];
  if (!first) throw new Error('Missing opening match.');
  return {
    players: names.map(normalizeName),
    matches,
    matchIndex: 0,
    turn: 0,
    phase: TournamentPhase.ready,
    game: createGame(first.boardCode),
  };
}

export function startTournamentTurn(state: TournamentState): TournamentState {
  return state.phase === TournamentPhase.ready
    ? { ...state, phase: TournamentPhase.playing }
    : state;
}

export function updateTournamentGame(state: TournamentState, game: GameState): TournamentState {
  if (state.phase !== TournamentPhase.playing || game.boardCode !== state.game.boardCode)
    return state;
  if (!isWon(game)) return { ...state, game };
  const matches = state.matches.map((match, index) => {
    if (index !== state.matchIndex) return match;
    const result = { moves: game.moves, elapsedMs: game.elapsedMs };
    return {
      ...match,
      results:
        state.turn === 0
          ? ([result, match.results[1]] as const)
          : ([match.results[0], result] as const),
    };
  });
  const phase =
    state.turn === 0
      ? TournamentPhase.turnFinished
      : state.matchIndex === matches.length - 1
        ? TournamentPhase.complete
        : TournamentPhase.matchFinished;
  return { ...state, game, matches, phase };
}

export function nextTournamentTurn(state: TournamentState): TournamentState {
  if (state.phase !== TournamentPhase.turnFinished && state.phase !== TournamentPhase.matchFinished)
    return state;
  const matchIndex = state.matchIndex + (state.phase === TournamentPhase.matchFinished ? 1 : 0);
  const match = state.matches[matchIndex];
  if (!match) return state;
  return {
    ...state,
    matchIndex,
    turn: state.phase === TournamentPhase.turnFinished ? 1 : 0,
    phase: TournamentPhase.ready,
    game: createGame(match.boardCode),
  };
}
