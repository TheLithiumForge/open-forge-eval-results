import { describe, expect, it } from 'vitest';
import { MAX_ELAPSED_MS } from './advanceGame.ts';
import { replayGame, REPLAY_ACTION_LIMIT, REPLAY_BYTE_LIMIT } from './replay.ts';

const replay = {
  version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
};
const run = (value: unknown) => replayGame(JSON.stringify(value));

describe('replay format and logical timing', () => {
  it('plays the documented example', () => {
    const state = run(replay);
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });
  it('starts elapsed time on activation and preserves equal-time ordering', () => {
    const actions = [{ atMs: 1000, index: 0 }, { atMs: 1000, index: 0 }, { atMs: 1000, index: 11 }];
    expect(run({ ...replay, actions, endMs: 1800 })?.elapsedMs).toBe(800);
    expect(run({ ...replay, actions: [], endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(0);
  });
  it('resolves a mismatch exactly before a boundary activation', () => {
    const actions = [
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 2 },
      { atMs: 800, index: 2 }, { atMs: 800, index: 6 },
    ];
    const state = run({ ...replay, actions, endMs: 800 });
    expect(state?.matched).toEqual([2, 6]);
    expect(state?.moves).toBe(2);
    expect(state?.selection).toEqual({ kind: 'closed' });
  });
  it('caps elapsed time while permitting safe-integer timeline values', () => {
    expect(run({ ...replay, endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(MAX_ELAPSED_MS);
  });
  it.each([
    { ...replay, unknown: 1 }, { ...replay, version: 2 }, { ...replay, boardCode: 'np1-3-1' },
    { ...replay, endMs: -1 }, { ...replay, endMs: 0.5 }, { ...replay, endMs: Number.MAX_SAFE_INTEGER + 1 },
    { ...replay, actions: [{ atMs: 1000, index: 0 }] },
    { ...replay, actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }] },
    ...[-1, 16, 1.5].map((index) => ({ ...replay, actions: [{ atMs: 0, index }] })),
    ...[-1, 1.5, Number.MAX_SAFE_INTEGER + 1].map((atMs) => ({ ...replay, actions: [{ atMs, index: 0 }] })),
    { ...replay, actions: [{ atMs: 0, index: 0, unknown: 1 }] },
    { ...replay, actions: [{ index: 0 }] }, { ...replay, actions: 'no' },
    { ...replay, actions: Array.from({ length: REPLAY_ACTION_LIMIT + 1 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay %#', (value) => expect(run(value)).toBeNull());
  it('checks action and UTF-8 byte limits', () => {
    const actions = Array.from({ length: REPLAY_ACTION_LIMIT }, () => ({ atMs: 0, index: 0 }));
    expect(run({ ...replay, actions })).not.toBeNull();
    expect(replayGame('{')).toBeNull();
    expect(replayGame(JSON.stringify(replay) + ' '.repeat(REPLAY_BYTE_LIMIT))).toBeNull();
  });
});
