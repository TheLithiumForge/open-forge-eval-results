import { createGame } from '../transitions.ts'
import { MAX_SEED, type BoardSize } from '../model.ts'

export function freshBoardCode(size: BoardSize, previousCode?: string): string {
  let seed = newSeed()
  while (`np1-${size}-${seed}` === previousCode) seed = newSeed()
  return `np1-${size}-${seed}`
}

export function freshGame(size: BoardSize, previousCode?: string) {
  const game = createGame(freshBoardCode(size, previousCode))
  if (game === null) throw new Error('Unable to create a valid game')
  return game
}

function newSeed(): number {
  try {
    const value = new Uint32Array(1)
    globalThis.crypto.getRandomValues(value)
    return (value[0] ?? 0) % MAX_SEED + 1
  } catch {
    return Math.floor(Math.random() * MAX_SEED) + 1
  }
}
