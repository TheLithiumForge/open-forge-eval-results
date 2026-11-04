import { describe, expect, it } from 'vitest'
import { replayGame } from './replay.ts'

describe('replays', () => {
  it('plays the documented equal-time pair', () => {
    const replay = '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}'
    const state = replayGame(replay)
    expect(state?.matched).toEqual([0, 11])
    expect(state?.moves).toBe(1)
    expect(state?.elapsedMs).toBe(800)
  })

  it('closes a mismatch before an activation at exactly 800ms', () => {
    const replay = '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":1},{"atMs":800,"index":0}],"endMs":800}'
    expect(replayGame(replay)?.selection).toEqual({ kind: 'one', index: 0 })
  })

  it('rejects invalid ordering, extra keys and unsupported versions', () => {
    expect(replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":2,"index":0},{"atMs":1,"index":1}],"endMs":3}')).toBeNull()
    expect(replayGame('{"version":2,"boardCode":"np1-4-1","actions":[],"endMs":0}')).toBeNull()
    expect(replayGame('{"version":1,"boardCode":"np1-4-1","actions":[],"endMs":0,"extra":1}')).toBeNull()
  })

  it('enforces action count, replay bytes, and the elapsed time cap', () => {
    const empty = { version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0 }
    const replay = JSON.stringify(empty)
    expect(replayGame(replay + ' '.repeat(1048576 - replay.length))).not.toBeNull()
    expect(replayGame(replay + ' '.repeat(1048577 - replay.length))).toBeNull()
    const actions = Array.from({ length: 10000 }, () => ({ atMs: 0, index: 0 }))
    expect(replayGame(JSON.stringify({ ...empty, actions }))).not.toBeNull()
    expect(replayGame(JSON.stringify({ ...empty, actions: [...actions, { atMs: 0, index: 0 }] }))).toBeNull()
    const capped = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0}],"endMs":9007199254740991}')
    expect(capped?.elapsedMs).toBe(359999999)
  })
})
