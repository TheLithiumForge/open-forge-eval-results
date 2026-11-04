import { createGame } from './game.ts'
import type { GameState, Selection } from './model.ts'
import {
  MAX_ELAPSED_MS,
  MAX_MOVES,
  MISMATCH_MS,
  SELECTION_KIND,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_VERSION,
  freezeState,
} from './model.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value)
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key))
}

function isNonnegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function decodeSelection(value: unknown, state: GameState, matched: ReadonlySet<number>): Selection | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null
  if (value.kind === SELECTION_KIND.closed) {
    return hasKeys(value, ['kind']) ? { kind: SELECTION_KIND.closed } : null
  }
  if (value.kind === SELECTION_KIND.one) {
    if (!hasKeys(value, ['kind', 'index'])) return null
    if (!isNonnegativeSafeInteger(value.index) || value.index >= state.deck.length || matched.has(value.index)) return null
    return { kind: SELECTION_KIND.one, index: value.index }
  }
  if (value.kind === SELECTION_KIND.mismatch) {
    if (!hasKeys(value, ['kind', 'first', 'second', 'remainingMs'])) return null
    const { first, second, remainingMs } = value
    if (!isNonnegativeSafeInteger(first) || !isNonnegativeSafeInteger(second)) return null
    if (first >= state.deck.length || second >= state.deck.length || first === second) return null
    if (matched.has(first) || matched.has(second)) return null
    if (state.deck[first] === state.deck[second]) return null
    if (!isNonnegativeSafeInteger(remainingMs) || remainingMs < 1 || remainingMs > MISMATCH_MS) return null
    return { kind: SELECTION_KIND.mismatch, first, second, remainingMs }
  }
  return null
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > SNAPSHOT_MAX_BYTES) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(parsed) || !hasKeys(parsed, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])) return null
  if (parsed.version !== SNAPSHOT_VERSION || typeof parsed.boardCode !== 'string' || !Array.isArray(parsed.matched)) return null
  if (!isNonnegativeSafeInteger(parsed.moves) || parsed.moves > MAX_MOVES) return null
  if (!isNonnegativeSafeInteger(parsed.elapsedMs) || parsed.elapsedMs > MAX_ELAPSED_MS) return null
  if (typeof parsed.started !== 'boolean') return null
  const initial = createGame(parsed.boardCode)
  if (!initial) return null
  const matched: number[] = []
  const matchedSet = new Set<number>()
  for (const index of parsed.matched) {
    if (!isNonnegativeSafeInteger(index) || index >= initial.deck.length || matchedSet.has(index)) return null
    matched.push(index)
    matchedSet.add(index)
  }
  const faceCounts = new Map<number, number>()
  for (const index of matched) {
    const face = initial.deck[index]
    if (face === undefined) return null
    faceCounts.set(face, (faceCounts.get(face) ?? 0) + 1)
  }
  if ([...faceCounts.values()].some((count) => count !== 2)) return null
  const candidate = { ...initial, matched, moves: parsed.moves, elapsedMs: parsed.elapsedMs, started: parsed.started }
  const selection = decodeSelection(parsed.selection, candidate, matchedSet)
  if (!selection) return null
  const pairCount = matched.length / 2
  const requiredMoves = pairCount + (selection.kind === SELECTION_KIND.mismatch ? 1 : 0)
  if (parsed.moves < requiredMoves) return null
  if (!parsed.started && (parsed.moves !== 0 || parsed.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== SELECTION_KIND.closed)) return null
  if (parsed.started && parsed.moves === 0 && selection.kind !== SELECTION_KIND.one) return null
  if (matched.length === initial.deck.length && selection.kind !== SELECTION_KIND.closed) return null
  return freezeState({ ...candidate, selection })
}

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.board.code,
    matched: state.matched,
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  }, null, 2)
}
