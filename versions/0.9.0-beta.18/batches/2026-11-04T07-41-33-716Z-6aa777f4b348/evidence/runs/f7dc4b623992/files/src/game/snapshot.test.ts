import { describe, expect, it } from 'vitest'
import { activateCard, createGame } from './game.ts'
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readObject(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text)
  if (!isRecord(value)) throw new Error('fixture JSON is not an object')
  return value
}

function initialGame() {
  const state = createGame('np1-4-1')
  if (!state) throw new Error('fixture board is invalid')
  return state
}

describe('version 1 snapshots', () => {
  it('round trips game progress and exports only the specified fields', () => {
    const state = activateCard(activateCard(initialGame(), 0), 1)
    const text = encodeSnapshot(state)
    expect(Object.keys(readObject(text))).toEqual([
      'version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started',
    ])
    expect(decodeSnapshot(text)).toEqual(state)
  })

  it('rejects malformed JSON, unknown keys, oversized UTF-8 and unsupported versions', () => {
    const valid = readObject(encodeSnapshot(initialGame()))
    expect(decodeSnapshot('{')).toBeNull()
    expect(decodeSnapshot(JSON.stringify({ ...valid, extra: true }))).toBeNull()
    expect(decodeSnapshot(JSON.stringify({ ...valid, version: 2 }))).toBeNull()
    expect(decodeSnapshot(' '.repeat(65_537))).toBeNull()
    expect(decodeSnapshot(`"${'é'.repeat(32_768)}"`)).toBeNull()
  })

  it('requires complete pairs, unique indices and enough moves', () => {
    const base = readObject(encodeSnapshot(initialGame()))
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [4] }))).toBeNull()
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [4, 5, 4] }))).toBeNull()
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [4, 5] }))).toBeNull()
  })

  it('validates selection shapes, mismatch timing and started-state consistency', () => {
    const initial = initialGame()
    const one = encodeSnapshot(activateCard(initial, 0))
    const oneData = readObject(one)
    const validMismatch = activateCard(activateCard(initial, 0), 1)
    const mismatch = readObject(encodeSnapshot(validMismatch))
    expect(decodeSnapshot(one)).not.toBeNull()
    expect(decodeSnapshot(JSON.stringify({ ...oneData, selection: { kind: 'one', index: 0, extra: 1 } }))).toBeNull()
    expect(decodeSnapshot(JSON.stringify({ ...oneData, selection: { kind: 'closed' } }))).toBeNull()
    expect(decodeSnapshot(JSON.stringify({ ...mismatch, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 801 } }))).toBeNull()
    expect(decodeSnapshot(JSON.stringify({ ...mismatch, moves: 0 }))).toBeNull()
    expect(decodeSnapshot(JSON.stringify({ ...oneData, started: false }))).toBeNull()
  })

  it('accepts a valid matched pair in any position order', () => {
    const initial = initialGame()
    const matched = activateCard(activateCard(initial, 4), 5)
    const saved = readObject(encodeSnapshot(matched))
    expect(decodeSnapshot(JSON.stringify({ ...saved, matched: [5, 4] }))).not.toBeNull()
  })
})
