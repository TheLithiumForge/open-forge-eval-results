import { describe, expect, it } from 'vitest'
import { createGame, activateCard } from './transitions.ts'
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts'

const start = createGame('np1-4-1')
if (start === null) throw new Error('Test vector must parse')

describe('snapshots', () => {
  it('round trips a started game and the documented mismatch example', () => {
    const current = activateCard(activateCard(start, 0), 1)
    expect(decodeSnapshot(encodeSnapshot(current))).toEqual(current)
    const example = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}'
    const restored = decodeSnapshot(example)
    expect(restored?.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 300 })
  })

  it.each([
    '{',
    '{"version":2}',
    '{"version":1,"boardCode":"np1-4-1","matched":[0],"selection":{"kind":"closed"},"moves":0,"elapsedMs":0,"started":false}',
    '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"closed","extra":true},"moves":0,"elapsedMs":0,"started":false}',
  ])('rejects malformed state %s', (json) => {
    expect(decodeSnapshot(json)).toBeNull()
  })

  it('accepts valid capped progress and rejects elapsed time above the cap', () => {
    const capped = '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":0},"moves":999999,"elapsedMs":359999999,"started":true}'
    expect(decodeSnapshot(capped)?.moves).toBe(999999)
    expect(decodeSnapshot(capped.replace('359999999', '360000000'))).toBeNull()
  })

  it('can export readable JSON for manual copying', () => {
    expect(encodeSnapshot(start, true)).toContain('\n  "boardCode"')
  })

  it('rejects partial pairs, extra data, and inconsistent selection states', () => {
    const base = { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false }
    const invalid = [
      { ...base, extra: true },
      { ...base, matched: [0] },
      { ...base, matched: [0, 1], moves: 1, started: true },
      { ...base, moves: 1 },
      { ...base, elapsedMs: 1 },
      { ...base, started: true },
      { ...base, started: true, selection: { kind: 'one', index: 16 } },
      { ...base, started: true, selection: { kind: 'one', index: 0, extra: true } },
      { ...base, started: true, moves: 1, selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 1 } },
      { ...base, started: true, moves: 1, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 0 } },
      { ...base, started: true, moves: 1, selection: { kind: 'mismatch', first: 0, second: 0, remainingMs: 1 } },
      { ...base, moves: 1000000, started: true, selection: { kind: 'one', index: 0 } },
    ]
    for (const value of invalid) expect(decodeSnapshot(JSON.stringify(value))).toBeNull()
  })

  it('applies the UTF-8 byte limit at the exact boundary', () => {
    const compact = '{"version":1,"boardCode":"np1-4-1","matched":[],"selection":{"kind":"closed"},"moves":0,"elapsedMs":0,"started":false}'
    expect(decodeSnapshot(compact + ' '.repeat(65536 - compact.length))).not.toBeNull()
    expect(decodeSnapshot(compact + ' '.repeat(65537 - compact.length))).toBeNull()
  })
})
