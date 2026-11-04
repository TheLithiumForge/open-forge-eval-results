import { isBoardSize } from '../board.ts'
import { MAX_MOVES, type BoardSize } from '../model.ts'

const STORAGE_KEY = 'neon-pairs.preferences.v1'

export type SavedPreferences = Readonly<{
  size: BoardSize
  bests: Readonly<Partial<Record<BoardSize, number>>>
}>

export function readPreferences(): SavedPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null || raw.length > 4096) return emptyPreferences()
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.bests)) return emptyPreferences()
    const size = typeof value.size === 'number' && isBoardSize(value.size) ? value.size : 4
    const bests: Partial<Record<BoardSize, number>> = {}
    for (const supported of [4, 6, 8, 10, 12, 14, 16] as const) {
      const score = value.bests[String(supported)]
      if (isScore(score)) bests[supported] = score
    }
    return Object.freeze({ size, bests: Object.freeze(bests) })
  } catch {
    return emptyPreferences()
  }
}

export function writePreferences(preferences: SavedPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      size: preferences.size,
      bests: preferences.bests,
    }))
  } catch {
    // Storage can be blocked; the in-memory session remains playable.
  }
}

export function withSize(preferences: SavedPreferences, size: BoardSize): SavedPreferences {
  return Object.freeze({ ...preferences, size })
}

export function withBest(preferences: SavedPreferences, size: BoardSize, moves: number): SavedPreferences {
  const current = preferences.bests[size]
  if (!isScore(moves) || (current !== undefined && current <= moves)) return preferences
  return Object.freeze({
    ...preferences,
    bests: Object.freeze({ ...preferences.bests, [size]: moves }),
  })
}

function emptyPreferences(): SavedPreferences {
  return Object.freeze({ size: 4, bests: Object.freeze({}) })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_MOVES
}
