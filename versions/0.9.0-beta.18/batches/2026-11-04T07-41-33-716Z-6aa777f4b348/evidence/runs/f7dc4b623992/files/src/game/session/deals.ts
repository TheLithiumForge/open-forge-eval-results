import { createGame } from '../game.ts'
import { MAX_SEED, type BoardSize } from '../board.ts'
import { readPreferredSize } from './storage.ts'
import type { GameState } from '../model.ts'

export function freshBoardCode(size: BoardSize, previousSeed?: number): string {
  const values = new Uint32Array(1)
  let seed: number
  try {
    seed = typeof crypto !== 'undefined'
      ? (crypto.getRandomValues(values), (values[0] ?? 0) % MAX_SEED + 1)
      : Math.floor(Math.random() * MAX_SEED) + 1
  } catch {
    seed = Math.floor(Math.random() * MAX_SEED) + 1
  }
  if (seed === previousSeed) seed = seed === MAX_SEED ? 1 : seed + 1
  return `np1-${size}-${seed}`
}

export function initialGame(): GameState {
  const game = createGame(freshBoardCode(readPreferredSize()))
  if (!game) throw new Error('Unable to create a supported board')
  return game
}
