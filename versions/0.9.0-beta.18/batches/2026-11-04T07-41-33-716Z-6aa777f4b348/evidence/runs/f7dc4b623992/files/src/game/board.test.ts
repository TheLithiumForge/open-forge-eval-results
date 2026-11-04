import { describe, expect, it } from 'vitest'
import { createDeck, parseBoardCode, SUPPORTED_SIZES } from './board.ts'

describe('board codes and deterministic decks', () => {
  it('matches the published version 1 deck vector', () => {
    expect(createDeck('np1-4-1')).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3])
  })

  it('matches an independent deck vector that rejects the first shuffle draw', () => {
    expect(createDeck('np1-4-739806647')).toEqual([6, 7, 2, 4, 5, 0, 3, 1, 0, 7, 5, 4, 6, 2, 1, 3])
  })

  it('uses a reproducible deal with every face exactly twice at each size', () => {
    for (const size of SUPPORTED_SIZES) {
      const first = createDeck(`np1-${size}-2147483646`)
      const second = createDeck(`np1-${size}-2147483646`)
      expect(second).toEqual(first)
      const counts = new Map<number, number>()
      for (const face of first ?? []) counts.set(face, (counts.get(face) ?? 0) + 1)
      expect(counts.size).toBe((size * size) / 2)
      expect([...counts.values()].every((count) => count === 2)).toBe(true)
    }
  })

  it('accepts only the exact supported board code syntax', () => {
    expect(parseBoardCode('np1-4-1')).toEqual({ code: 'np1-4-1', size: 4, seed: 1 })
    for (const code of [
      'np1-4-0', 'np1-4-01', 'np1-5-1', 'np1-4-2147483647',
      'np1-4-1 ', ' np1-4-1', 'np1-4-1\n', 'NP1-4-1', 'np1-4-1x',
    ]) {
      expect(parseBoardCode(code), code).toBeNull()
    }
  })
})
