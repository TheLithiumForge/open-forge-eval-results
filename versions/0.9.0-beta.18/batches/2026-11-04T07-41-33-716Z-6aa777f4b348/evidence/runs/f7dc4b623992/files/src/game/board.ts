import type { Board } from './model.ts'

export const SUPPORTED_SIZES = [4, 6, 8, 10, 12, 14, 16] as const
export const MAX_SEED = 2_147_483_646
const PARK_MILLER_MODULUS = 2_147_483_647
const PARK_MILLER_MULTIPLIER = 16_807
const GENERATOR_RANGE = 2_147_483_646

export type BoardSize = (typeof SUPPORTED_SIZES)[number]

export function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === 'number' && SUPPORTED_SIZES.some((size) => size === value)
}

export function parseBoardCode(code: string): Board | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/u.exec(code)
  if (!match || match[0] !== code) return null
  const size = Number(match[1])
  const seed = Number(match[2])
  if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > MAX_SEED) return null
  return Object.freeze({ code, size, seed })
}

function draw(state: { value: number }, bound: number): number {
  const limit = Math.floor(GENERATOR_RANGE / bound) * bound
  while (true) {
    state.value = (state.value * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS
    const sample = state.value - 1
    if (sample < limit) return sample % bound
  }
}

export function createDeck(boardCode: string): readonly number[] | null {
  const board = parseBoardCode(boardCode)
  if (!board) return null
  const deck = Array.from({ length: board.size * board.size }, (_, index) => Math.floor(index / 2))
  const generator = { value: board.seed }
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = draw(generator, index + 1)
    const current = deck[index]
    const swapped = deck[other]
    if (current === undefined || swapped === undefined) return null
    deck[index] = swapped
    deck[other] = current
  }
  return Object.freeze(deck)
}
