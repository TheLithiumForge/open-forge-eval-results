import { describe, expect, it } from 'vitest'
import { parseBoardCode } from './board.ts'

const expected = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]

describe('board codes', () => {
  it('matches the independent version 1 deck vector', () => {
    expect(parseBoardCode('np1-4-1')?.deck).toEqual(expected)
  })

  it.each(['np1-4-0', 'np1-4-01', 'np1-5-1', 'np1-4-2147483647', 'np1-4-1\n'])('rejects invalid code %j', (code) => {
    expect(parseBoardCode(code)).toBeNull()
  })

  it('freezes its board and deck', () => {
    const board = parseBoardCode('np1-4-1')
    expect(board === null ? false : Object.isFrozen(board.deck)).toBe(true)
  })

  it('creates complete pairs on every supported square size', () => {
    for (const size of [4, 6, 8, 10, 12, 14, 16]) {
      const board = parseBoardCode(`np1-${size}-2147483646`)
      expect(board?.deck).toHaveLength(size * size)
      const occurrences = new Map<number, number>()
      for (const face of board?.deck ?? []) occurrences.set(face, (occurrences.get(face) ?? 0) + 1)
      expect([...occurrences.values()]).toEqual(Array(size * size / 2).fill(2))
    }
  })
})
