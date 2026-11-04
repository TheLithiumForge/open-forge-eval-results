export const BOARD_SIZES = [4, 6, 8, 10, 12, 14, 16] as const
export const MAX_SEED = 2147483646
export const MAX_MOVES = 999999
export const MAX_ELAPSED_MS = 359999999
export const MISMATCH_MS = 800

export const SELECTION_KINDS = { closed: 'closed', one: 'one', mismatch: 'mismatch' } as const

export type BoardSize = (typeof BOARD_SIZES)[number]
export type SelectionKind = (typeof SELECTION_KINDS)[keyof typeof SELECTION_KINDS]
export type Board = Readonly<{
  code: string
  size: BoardSize
  seed: number
  deck: readonly number[]
}>
export type Selection =
  | Readonly<{ kind: typeof SELECTION_KINDS.closed }>
  | Readonly<{ kind: typeof SELECTION_KINDS.one; index: number }>
  | Readonly<{ kind: typeof SELECTION_KINDS.mismatch; first: number; second: number; remainingMs: number }>
export type GameState = Readonly<{
  board: Board
  matched: readonly number[]
  selection: Selection
  moves: number
  elapsedMs: number
  started: boolean
}>
