import { parseBoardCode } from './board.ts'
import { advanceGame, activateCard, createGame } from './transitions.ts'
import type { GameState } from './model.ts'

const REPLAY_VERSION = 1
const MAX_REPLAY_BYTES = 1048576
const MAX_ACTIONS = 10000

type Action = Readonly<{ atMs: number; index: number }>

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > MAX_REPLAY_BYTES) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, ['version', 'boardCode', 'actions', 'endMs'])) return null
  if (parsed.version !== REPLAY_VERSION || typeof parsed.boardCode !== 'string') return null
  if (!isTime(parsed.endMs) || !Array.isArray(parsed.actions) || parsed.actions.length > MAX_ACTIONS) return null
  const board = parseBoardCode(parsed.boardCode)
  if (board === null) return null
  const actions: Action[] = []
  let previousTime = 0
  for (const item of parsed.actions) {
    if (!isRecord(item) || !hasExactKeys(item, ['atMs', 'index'])) return null
    if (!isTime(item.atMs) || !isIndex(item.index, board.deck.length)) return null
    if (item.atMs < previousTime) return null
    actions.push(Object.freeze({ atMs: item.atMs, index: item.index }))
    previousTime = item.atMs
  }
  const lastAction = actions[actions.length - 1]
  if (lastAction !== undefined && parsed.endMs < lastAction.atMs) return null
  return runActions(parsed.boardCode, actions, parsed.endMs)
}

function runActions(boardCode: string, actions: readonly Action[], endMs: number): GameState | null {
  let state = createGame(boardCode)
  if (state === null) return null
  let previousTime = actions[0]?.atMs ?? 0
  for (const action of actions) {
    const elapsed = action.atMs - previousTime
    state = advanceGame(state, elapsed)
    state = activateCard(state, action.index)
    previousTime = action.atMs
  }
  return advanceGame(state, endMs - previousTime)
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(record, key))
}

function isIndex(value: unknown, length: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < length
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
