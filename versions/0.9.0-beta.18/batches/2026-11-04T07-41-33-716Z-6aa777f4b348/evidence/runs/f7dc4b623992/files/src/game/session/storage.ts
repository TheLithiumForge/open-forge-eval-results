import { MAX_MOVES } from '../model.ts'
import { isBoardSize, type BoardSize } from '../board.ts'

const PREFERENCE_KEY = 'neon-pairs.preferences.v1'
const BEST_KEY = 'neon-pairs.best.v1'
export type BestScores = Readonly<Partial<Record<BoardSize, number>>>

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

export function readPreferredSize(): BoardSize {
  const value = readJson(PREFERENCE_KEY)
  return record(value) && isBoardSize(value.size) ? value.size : 4
}

export function savePreferredSize(size: BoardSize): void {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ size }))
  } catch {
    // Storage is optional; keep the current session playable.
  }
}

export function readBestScores(): BestScores {
  const value = readJson(BEST_KEY)
  if (!record(value)) return Object.freeze({})
  const scores: Partial<Record<BoardSize, number>> = {}
  for (const size of [4, 6, 8, 10, 12, 14, 16] as const) {
    const score = value[size]
    if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MAX_MOVES) {
      scores[size] = score
    }
  }
  return Object.freeze(scores)
}

export function recordBest(size: BoardSize, moves: number, previous: BestScores): BestScores {
  const current = previous[size]
  if (current !== undefined && current <= moves) return previous
  const next = Object.freeze({ ...previous, [size]: moves })
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(next))
  } catch {
    // Best scores never prevent play.
  }
  return next
}
