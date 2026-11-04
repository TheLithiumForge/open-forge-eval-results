import { BOARD_SIZES, MAX_SEED, type Board, type BoardSize } from './model.ts'

const MODULUS = 2147483647
const MULTIPLIER = 16807
const RANGE = 2147483646

export function parseBoardCode(code: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code)
  const sizeText = match?.[1]
  const seedText = match?.[2]
  if (match === null || match[0] !== code || sizeText === undefined || seedText === undefined) return null
  const size = Number(sizeText)
  const seed = Number(seedText)
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null
  return Object.freeze({ code, size, seed, deck: Object.freeze(makeDeck(size, seed)) })
}

export function isBoardSize(value: number): value is BoardSize {
  return BOARD_SIZES.some((size) => size === value)
}

function makeDeck(size: BoardSize, seed: number): number[] {
  const deck: number[] = []
  for (let face = 0; face < (size * size) / 2; face += 1) deck.push(face, face)
  let state = seed
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const possible = index + 1
    const limit = Math.floor(RANGE / possible) * possible
    let x = limit
    while (x >= limit) {
      state = (state * MULTIPLIER) % MODULUS
      x = state - 1
    }
    const swapIndex = x % possible
    const current = deck[index]
    const other = deck[swapIndex]
    if (current === undefined || other === undefined) throw new Error('Invalid deck index')
    deck[index] = other
    deck[swapIndex] = current
  }
  return deck
}
