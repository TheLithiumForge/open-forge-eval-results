import { describe, expect, it } from 'vitest'
import { describeFace } from './face.ts'

describe('face identities', () => {
  it('uses the documented component order and face names', () => {
    expect(describeFace(0)?.name).toBe('cyan solid circle, marker top')
    expect(describeFace(64)?.name).toBe('cyan outline circle, marker top')
    expect(describeFace(63)?.name).toBe('ice solid chevron, marker top-left')
    expect(describeFace(127)?.name).toBe('ice outline chevron, marker top-left')
  })

  it('generates all 128 named shape-marker-fill identities', () => {
    const identities = Array.from({ length: 128 }, (_, id) => describeFace(id)?.name)
    expect(new Set(identities).size).toBe(128)
    expect(describeFace(-1)).toBeNull()
    expect(describeFace(128)).toBeNull()
  })
})
