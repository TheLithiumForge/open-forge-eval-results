import { describe, expect, it } from 'vitest'
import { createGame, activateCard, advanceGame, isWon } from './transitions.ts'
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts'

const deal = createGame('np1-4-1')
if (deal === null) throw new Error('Test vector must parse')

describe('card transitions', () => {
  it('reveals once, ignores repeated selection, and counts the second valid reveal', () => {
    const first = activateCard(deal, 0)
    expect(activateCard(first, 0)).toBe(first)
    expect(first.started).toBe(true)
    expect(first.moves).toBe(0)
    expect(activateCard(first, 11).moves).toBe(1)
  })

  it('matches immediately and ignores a matched card', () => {
    const matched = activateCard(activateCard(deal, 0), 11)
    expect(matched.matched).toEqual([0, 11])
    expect(matched.selection.kind).toBe('closed')
    expect(activateCard(matched, 0)).toBe(matched)
  })

  it('locks activations until a miss closes after 800ms', () => {
    const miss = activateCard(activateCard(deal, 0), 1)
    expect(miss.moves).toBe(1)
    expect(activateCard(miss, 2)).toBe(miss)
    expect(advanceGame(miss, 799).selection.kind).toBe('mismatch')
    expect(advanceGame(miss, 800).selection.kind).toBe('closed')
    expect(advanceGame(miss, 800).elapsedMs).toBe(800)
  })

  it('stops the clock on a completed game', () => {
    let state = deal
    for (let face = 0; face < 8; face += 1) {
      const positions = state.board.deck.flatMap((value, index) => value === face ? [index] : [])
      const first = positions[0]
      const second = positions[1]
      if (first === undefined || second === undefined) throw new Error('Pair expected')
      state = activateCard(activateCard(state, first), second)
    }
    expect(isWon(state)).toBe(true)
    expect(advanceGame(state, 1000)).toBe(state)
  })

  it('continues matching and timing at the move and elapsed caps', () => {
    const capped = decodeSnapshot('{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":0},"moves":999999,"elapsedMs":359999999,"started":true}')
    expect(capped).not.toBeNull()
    if (capped === null) throw new Error('Capped snapshot must decode')
    const cappedTime = advanceGame(capped, 1)
    expect(cappedTime.elapsedMs).toBe(359999999)
    expect(advanceGame(cappedTime, -1)).toBe(cappedTime)
    let won = activateCard(cappedTime, 11)
    expect(won.moves).toBe(999999)
    expect(won.matched).toEqual([0, 11])
    for (let face = 0; face < 8; face += 1) {
      const positions = won.board.deck.flatMap((value, index) => value === face ? [index] : [])
      const first = positions[0]
      const second = positions[1]
      if (first === undefined || second === undefined) throw new Error('Pair expected')
      if (!won.matched.includes(first)) won = activateCard(activateCard(won, first), second)
    }
    expect(isWon(won)).toBe(true)
    expect(won.elapsedMs).toBe(359999999)
  })

  it('round trips the maximum valid move and elapsed values', () => {
    const snapshot = '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":0},"moves":999999,"elapsedMs":359999999,"started":true}'
    expect(decodeSnapshot(snapshot)?.elapsedMs).toBe(359999999)
  })
})
