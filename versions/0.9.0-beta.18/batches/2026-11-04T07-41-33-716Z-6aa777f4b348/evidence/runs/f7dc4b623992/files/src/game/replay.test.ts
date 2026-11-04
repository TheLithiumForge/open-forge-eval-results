import { describe, expect, it } from 'vitest'
import { SELECTION_KIND } from './model.ts'
import { replayGame } from './replay.ts'

describe('version 1 replay', () => {
  it('replays the published match example into the expected final snapshot', () => {
    const replay = JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 })
    expect(replayGame(replay)).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, started: true })
  })

  it('resolves a mismatch exactly at an action time before activating that card', () => {
    const replay = JSON.stringify({
      version: 1,
      boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 1 }],
      endMs: 800,
    })
    expect(replayGame(replay)).toMatchObject({
      selection: { kind: SELECTION_KIND.one, index: 1 }, moves: 1, elapsedMs: 800,
    })
  })

  it('uses replay time for mismatches beyond the elapsed cap', () => {
    const replay = JSON.stringify({
      version: 1,
      boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }],
      endMs: 359_999_999,
    })
    expect(replayGame(replay)).toMatchObject({ selection: { kind: SELECTION_KIND.closed }, elapsedMs: 359_999_999 })
  })

  it('supports safe integer timestamps and starts elapsed time at the first reveal', () => {
    const replay = JSON.stringify({
      version: 1,
      boardCode: 'np1-4-1',
      actions: [{ atMs: Number.MAX_SAFE_INTEGER - 10, index: 0 }, { atMs: Number.MAX_SAFE_INTEGER - 10, index: 1 }],
      endMs: Number.MAX_SAFE_INTEGER,
    })
    expect(replayGame(replay)).toMatchObject({ elapsedMs: 10, moves: 1 })
  })

  it('rejects malformed schemas, out-of-range positions and invalid timelines', () => {
    const base = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 2, index: 0 }], endMs: 2 }
    expect(replayGame('{')).toBeNull()
    expect(replayGame(JSON.stringify({ ...base, extra: true }))).toBeNull()
    expect(replayGame(JSON.stringify({ ...base, endMs: 1 }))).toBeNull()
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 3, index: 0 }, { atMs: 2, index: 1 }] }))).toBeNull()
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 2, index: 16 }] }))).toBeNull()
    expect(replayGame(' '.repeat(1_048_577))).toBeNull()
  })
})
