import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_BYTES, MAX_ACTIONS } from './replay.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const replay = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const run = (overrides: Record<string, unknown> = {}) => replayGame(JSON.stringify({ ...replay, ...overrides }));

describe('replay contract', () => {
  it('runs the literal specification example', () => {
    expect(run()).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, started: true, selection: { kind: 'closed' } });
  });
  it('starts the clock at the first activation, preserves equal-time order, and ignores blocked actions', () => {
    expect(run({ actions: [{ atMs: 1000, index: 0 }], endMs: 1500 })?.elapsedMs).toBe(500);
    expect(run({ actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 2 }], endMs: 799 }))
      .toMatchObject({ moves: 1, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 1 } });
    expect(run({ actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 }], endMs: 800 }))
      .toMatchObject({ moves: 1, selection: { kind: 'one', index: 2 } });
  });
  it('supports the entire safe integer timeline and caps elapsed time', () => {
    expect(run({ endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(359999999);
    expect(run({ actions: [], endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(0);
  });
  it.each([
    { version: 2 }, { extra: 0 }, { boardCode: 'np2-4-1' }, { endMs: -1 }, { endMs: 1.5 },
    { endMs: Number.MAX_SAFE_INTEGER + 1 }, { actions: [{ atMs: 801, index: 0 }] },
    { actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }] },
    { actions: [{ atMs: -1, index: 0 }] }, { actions: [{ atMs: 0, index: 16 }] },
    { actions: [{ atMs: 0, index: 1.5 }] }, { actions: [{ atMs: 0, index: 0, extra: 0 }] },
    { actions: [{ atMs: '0', index: 0 }] }, { actions: [null] }, { actions: {} },
  ])('rejects invalid replay %j', overrides => expect(run(overrides)).toBeNull());
  it('limits actions and encoded bytes', () => {
    expect(run({ actions: Array.from({ length: MAX_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })) })).toBeNull();
    expect(replayGame(' '.repeat(REPLAY_BYTES) + JSON.stringify(replay))).toBeNull();
    expect(replayGame('null')).toBeNull();
  });
  it('returns a snapshot-compatible final state', () => {
    const state = run();
    if (!state) throw new Error('Bad replay fixture');
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
  });
});
