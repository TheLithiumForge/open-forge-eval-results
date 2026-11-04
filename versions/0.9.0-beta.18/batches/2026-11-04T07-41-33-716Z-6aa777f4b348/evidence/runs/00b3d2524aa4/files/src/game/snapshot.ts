import { createGame, isWon } from './transitions.ts'
import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION_KINDS, type GameState, type Selection } from './model.ts'

const SNAPSHOT_VERSION = 1
const MAX_SNAPSHOT_BYTES = 65536
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']

export function encodeSnapshot(state: GameState, readable = false): string {
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.board.code,
    matched: state.matched,
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  }, null, readable ? 2 : undefined)
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > MAX_SNAPSHOT_BYTES) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, SNAPSHOT_KEYS)) return null
  if (parsed.version !== SNAPSHOT_VERSION || typeof parsed.boardCode !== 'string') return null
  if (!isIntegerIn(parsed.moves, 0, MAX_MOVES) || !isIntegerIn(parsed.elapsedMs, 0, MAX_ELAPSED_MS)) return null
  if (typeof parsed.started !== 'boolean' || !Array.isArray(parsed.matched)) return null
  const game = createGame(parsed.boardCode)
  if (game === null) return null
  const matched: number[] = []
  for (const value of parsed.matched) {
    if (!isIndex(value, game.board.deck.length) || matched.includes(value)) return null
    matched.push(value)
  }
  if (matched.length % 2 !== 0 || !matchedFacePairs(game.board.deck, matched)) return null
  const selection = readSelection(parsed.selection, game.board.deck, matched)
  if (selection === null) return null
  const pairs = matched.length / 2
  if (parsed.moves < pairs || (selection.kind === 'mismatch' && parsed.moves < pairs + 1)) return null
  if (!parsed.started) {
    if (parsed.moves !== 0 || parsed.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed') return null
  } else if (parsed.moves === 0 && selection.kind !== 'one') {
    return null
  }
  const restored: GameState = Object.freeze({
    board: game.board,
    matched: Object.freeze(matched),
    selection,
    moves: parsed.moves,
    elapsedMs: parsed.elapsedMs,
    started: parsed.started,
  })
  if (isWon(restored) && selection.kind !== 'closed') return null
  return restored
}

function readSelection(value: unknown, deck: readonly number[], matched: readonly number[]): Selection | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null
  if (value.kind === SELECTION_KINDS.closed) return hasExactKeys(value, ['kind']) ? Object.freeze({ kind: SELECTION_KINDS.closed }) : null
  if (value.kind === SELECTION_KINDS.one) {
    if (!hasExactKeys(value, ['kind', 'index']) || !isIndex(value.index, deck.length) || matched.includes(value.index)) return null
    return Object.freeze({ kind: SELECTION_KINDS.one, index: value.index })
  }
  if (value.kind === SELECTION_KINDS.mismatch) {
    if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])) return null
    if (!isIndex(value.first, deck.length) || !isIndex(value.second, deck.length) || value.first === value.second) return null
    if (matched.includes(value.first) || matched.includes(value.second)) return null
    if (!isIntegerIn(value.remainingMs, 1, MISMATCH_MS)) return null
    if (deck[value.first] === deck[value.second]) return null
    return Object.freeze({ kind: SELECTION_KINDS.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs })
  }
  return null
}

function matchedFacePairs(deck: readonly number[], matched: readonly number[]): boolean {
  const faces = new Set<number>()
  for (const index of matched) {
    const face = deck[index]
    if (face === undefined) return false
    faces.add(face)
  }
  for (const face of faces) {
    let count = 0
    for (const index of matched) if (deck[index] === face) count += 1
    if (count !== 2) return false
  }
  return true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(record, key))
}

function isIndex(value: unknown, length: number): value is number {
  return isIntegerIn(value, 0, length - 1)
}

function isIntegerIn(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
}
