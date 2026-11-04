import { createGame, activateCard, advanceGame } from './game.ts'
import type { GameState } from './model.ts'
import {
  REPLAY_MAX_ACTIONS,
  REPLAY_MAX_BYTES,
  REPLAY_VERSION,
} from './model.ts'

interface ReplayAction {
  readonly atMs: number
  readonly index: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function parseReplay(text: string): { boardCode: string; actions: ReplayAction[]; endMs: number } | null {
  if (new TextEncoder().encode(text).byteLength > REPLAY_MAX_BYTES) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(parsed) || !exactKeys(parsed, ['version', 'boardCode', 'actions', 'endMs'])) return null
  if (parsed.version !== REPLAY_VERSION || typeof parsed.boardCode !== 'string') return null
  if (!Array.isArray(parsed.actions) || parsed.actions.length > REPLAY_MAX_ACTIONS || !isTimestamp(parsed.endMs)) return null
  const actions: ReplayAction[] = []
  let previous = 0
  for (const value of parsed.actions) {
    if (!isRecord(value) || !exactKeys(value, ['atMs', 'index'])) return null
    if (!isTimestamp(value.atMs) || !isTimestamp(value.index) || value.atMs < previous) return null
    actions.push({ atMs: value.atMs, index: value.index })
    previous = value.atMs
  }
  if (parsed.endMs < previous) return null
  return { boardCode: parsed.boardCode, actions, endMs: parsed.endMs }
}

export function replayGame(text: string): GameState | null {
  const replay = parseReplay(text)
  if (!replay) return null
  let state = createGame(replay.boardCode)
  if (!state) return null
  let timeline = 0
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - timeline)
    if (action.index >= state.deck.length) return null
    state = activateCard(state, action.index)
    timeline = action.atMs
  }
  state = advanceGame(state, replay.endMs - timeline)
  return state
}
