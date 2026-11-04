import { createDeck, parseBoardCode } from './board.ts'
import type { GameState, Selection } from './model.ts'
import {
  CLOSED_SELECTION,
  MAX_ELAPSED_MS,
  MAX_MOVES,
  MISMATCH_MS,
  SELECTION_KIND,
  freezeState,
} from './model.ts'

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode)
  const deck = createDeck(boardCode)
  if (!board || !deck) return null
  return freezeState({
    board,
    deck,
    matched: [],
    selection: CLOSED_SELECTION,
    moves: 0,
    elapsedMs: 0,
    started: false,
  })
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.deck.length
}

function nextSelection(state: GameState, selection: Selection): GameState {
  return freezeState({ ...state, selection })
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.deck.length || isWon(state)) return state
  if (state.matched.includes(index) || state.selection.kind === SELECTION_KIND.mismatch) return state
  if (state.selection.kind === SELECTION_KIND.closed) {
    return freezeState({ ...state, selection: { kind: SELECTION_KIND.one, index }, started: true })
  }
  if (state.selection.index === index) return state
  const firstFace = state.deck[state.selection.index]
  const nextFace = state.deck[index]
  const moves = Math.min(MAX_MOVES, state.moves + 1)
  if (firstFace !== undefined && firstFace === nextFace) {
    return freezeState({
      ...state,
      matched: [...state.matched, state.selection.index, index],
      selection: CLOSED_SELECTION,
      moves,
    })
  }
  return freezeState({
    ...state,
    selection: { kind: SELECTION_KIND.mismatch, first: state.selection.index, second: index, remainingMs: MISMATCH_MS },
    moves,
  })
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || isWon(state)) return state
  const elapsedMs = state.started
    ? state.elapsedMs + Math.min(milliseconds, MAX_ELAPSED_MS - state.elapsedMs)
    : state.elapsedMs
  if (state.selection.kind !== SELECTION_KIND.mismatch) {
    return elapsedMs === state.elapsedMs ? state : freezeState({ ...state, elapsedMs })
  }
  const remainingMs = state.selection.remainingMs - milliseconds
  if (remainingMs <= 0) return freezeState({ ...state, elapsedMs, selection: CLOSED_SELECTION })
  return freezeState({ ...state, elapsedMs, selection: { ...state.selection, remainingMs } })
}

export function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1_000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
