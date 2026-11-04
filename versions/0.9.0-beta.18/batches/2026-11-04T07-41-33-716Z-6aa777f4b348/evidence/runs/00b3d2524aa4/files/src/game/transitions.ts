import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION_KINDS, type GameState } from './model.ts'
import { parseBoardCode } from './board.ts'

export function createGame(boardCode: string): GameState | null {
  const board = parseBoardCode(boardCode)
  if (board === null) return null
  return Object.freeze({
    board,
    matched: Object.freeze([]),
    selection: Object.freeze({ kind: SELECTION_KINDS.closed }),
    moves: 0,
    elapsedMs: 0,
    started: false,
  })
}

export function isWon(state: GameState): boolean {
  return state.matched.length === state.board.deck.length
}

export function activateCard(state: GameState, index: number): GameState {
  if (!Number.isSafeInteger(index) || index < 0 || index >= state.board.deck.length || isWon(state)) return state
  if (state.matched.includes(index)) return state
  const selection = state.selection
  if (selection.kind === 'mismatch') return state
  if (selection.kind === 'closed') {
    return Object.freeze({
      ...state,
      selection: Object.freeze({ kind: SELECTION_KINDS.one, index }),
      started: true,
    })
  }
  if (index === selection.index) return state
  const nextMoves = Math.min(MAX_MOVES, state.moves + 1)
  const firstFace = state.board.deck[selection.index]
  const secondFace = state.board.deck[index]
  if (firstFace === secondFace) {
    return Object.freeze({
      ...state,
      matched: Object.freeze([...state.matched, selection.index, index]),
      selection: Object.freeze({ kind: SELECTION_KINDS.closed }),
      moves: nextMoves,
      started: true,
    })
  }
  return Object.freeze({
    ...state,
    selection: Object.freeze({ kind: SELECTION_KINDS.mismatch, first: selection.index, second: index, remainingMs: MISMATCH_MS }),
    moves: nextMoves,
    started: true,
  })
}

export function advanceGame(state: GameState, milliseconds: number): GameState {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || !state.started || isWon(state)) return state
  const elapsedMs = milliseconds >= MAX_ELAPSED_MS - state.elapsedMs
    ? MAX_ELAPSED_MS
    : state.elapsedMs + milliseconds
  const selection = state.selection
  if (selection.kind !== 'mismatch') return Object.freeze({ ...state, elapsedMs })
  if (milliseconds >= selection.remainingMs) {
    return Object.freeze({ ...state, elapsedMs, selection: Object.freeze({ kind: SELECTION_KINDS.closed }) })
  }
  return Object.freeze({
    ...state,
    elapsedMs,
    selection: Object.freeze({ ...selection, remainingMs: selection.remainingMs - milliseconds }),
  })
}
