import { CLOSED_SELECTION, GAME_LIMITS, isWon, type GameState, type MismatchSelection } from './state.ts';

function isCardIndex(state: GameState, index: number): boolean {
  return Number.isSafeInteger(index) && index >= 0 && index < state.deck.length;
}

function hasMatched(state: GameState, index: number): boolean {
  return state.matched.includes(index);
}

function addMove(moves: number): number {
  return Math.min(GAME_LIMITS.maxMoves, moves + 1);
}

export function activateCard(state: GameState, index: number): GameState {
  if (!isCardIndex(state, index) || isWon(state) || hasMatched(state, index)) return state;
  switch (state.selection.kind) {
    case 'closed':
      return Object.freeze({ ...state, started: true, selection: Object.freeze({ kind: 'one', index }) });
    case 'one': {
      if (state.selection.index === index) return state;
      const moves = addMove(state.moves);
      const firstFace = state.deck[state.selection.index];
      const secondFace = state.deck[index];
      if (firstFace === secondFace) {
        const matched = Object.freeze([...state.matched, state.selection.index, index]);
        return Object.freeze({ ...state, matched, moves, selection: CLOSED_SELECTION });
      }
      const selection: MismatchSelection = Object.freeze({
        kind: 'mismatch', first: state.selection.index, second: index, remainingMs: GAME_LIMITS.mismatchMs,
      });
      return Object.freeze({ ...state, moves, selection });
    }
    case 'mismatch':
      return state;
  }
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !state.started || isWon(state)) return state;
  const elapsedMs = Math.min(GAME_LIMITS.maxElapsedMs, state.elapsedMs + milliseconds);
  switch (state.selection.kind) {
    case 'closed':
    case 'one':
      return Object.freeze({ ...state, elapsedMs });
    case 'mismatch':
      if (milliseconds >= state.selection.remainingMs) {
        return Object.freeze({ ...state, elapsedMs, selection: CLOSED_SELECTION });
      }
      return Object.freeze({
        ...state,
        elapsedMs,
        selection: Object.freeze({ ...state.selection, remainingMs: state.selection.remainingMs - milliseconds }),
      });
  }
}
