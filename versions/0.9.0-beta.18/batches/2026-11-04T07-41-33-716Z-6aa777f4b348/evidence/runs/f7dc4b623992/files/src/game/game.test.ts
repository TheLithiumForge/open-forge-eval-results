import { describe, expect, it } from 'vitest'
import { activateCard, advanceGame, createGame, formatElapsed, isWon } from './game.ts'
import { SELECTION_KIND } from './model.ts'

describe('game transitions and logical time', () => {
  it('reveals one card without a move, including repeated selection', () => {
    const initial = createGame('np1-4-1')
    if (!initial) throw new Error('fixture board is invalid')
    const first = activateCard(initial, 0)
    expect(first.selection).toEqual({ kind: SELECTION_KIND.one, index: 0 })
    expect(first.started).toBe(true)
    expect(first.moves).toBe(0)
    expect(activateCard(first, 0)).toBe(first)
  })

  it('keeps matches and waits exactly 800ms before closing misses', () => {
    const initial = createGame('np1-4-1')
    if (!initial) throw new Error('fixture board is invalid')
    const match = activateCard(activateCard(initial, 4), 5)
    expect(match.matched).toEqual([4, 5])
    expect(match.moves).toBe(1)
    expect(isWon(match)).toBe(false)
    let miss = activateCard(activateCard(match, 0), 1)
    expect(miss.moves).toBe(2)
    expect(activateCard(miss, 2)).toBe(miss)
    miss = advanceGame(miss, 799)
    expect(miss.selection).toMatchObject({ kind: SELECTION_KIND.mismatch, remainingMs: 1 })
    miss = advanceGame(miss, 1)
    expect(miss.selection).toEqual({ kind: SELECTION_KIND.closed })
    expect(miss.elapsedMs).toBe(800)
  })

  it('advances a mismatch after the elapsed clock is capped', () => {
    const initial = createGame('np1-4-1')
    if (!initial) throw new Error('fixture board is invalid')
    const miss = activateCard(activateCard(initial, 0), 1)
    const capped = { ...miss, elapsedMs: 359_999_999 }
    const resolved = advanceGame(capped, 800)
    expect(resolved.elapsedMs).toBe(359_999_999)
    expect(resolved.selection).toEqual({ kind: SELECTION_KIND.closed })
  })

  it('formats elapsed time with unbounded minutes and rounded-down seconds', () => {
    expect(formatElapsed(3_600_999)).toBe('60:00')
    expect(formatElapsed(123_000)).toBe('2:03')
  })
})
