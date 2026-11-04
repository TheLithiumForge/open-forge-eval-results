export const SELECTION_KIND = {
  closed: 'closed',
  one: 'one',
  mismatch: 'mismatch',
} as const

export type Selection =
  | { readonly kind: typeof SELECTION_KIND.closed }
  | { readonly kind: typeof SELECTION_KIND.one; readonly index: number }
  | {
      readonly kind: typeof SELECTION_KIND.mismatch
      readonly first: number
      readonly second: number
      readonly remainingMs: number
    }

export interface Board {
  readonly code: string
  readonly size: number
  readonly seed: number
}

export interface GameState {
  readonly board: Board
  readonly deck: readonly number[]
  readonly matched: readonly number[]
  readonly selection: Selection
  readonly moves: number
  readonly elapsedMs: number
  readonly started: boolean
}

export const SNAPSHOT_VERSION = 1
export const REPLAY_VERSION = 1
export const MISMATCH_MS = 800
export const MAX_MOVES = 999_999
export const MAX_ELAPSED_MS = 359_999_999
export const SNAPSHOT_MAX_BYTES = 65_536
export const REPLAY_MAX_BYTES = 1_048_576
export const REPLAY_MAX_ACTIONS = 10_000

export const CLOSED_SELECTION: Selection = Object.freeze({ kind: SELECTION_KIND.closed })

export function freezeState(state: GameState): GameState {
  return Object.freeze({
    ...state,
    board: Object.freeze({ ...state.board }),
    deck: Object.freeze([...state.deck]),
    matched: Object.freeze([...state.matched]),
    selection: Object.freeze({ ...state.selection }),
  })
}
