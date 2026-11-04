import { describe, expect, it } from 'vitest';
import { replayGame, MAX_REPLAY_ACTIONS, MAX_REPLAY_BYTES } from './replay.ts';
import { MAX_ELAPSED_MS } from './state.ts';

const replay = {
  version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
};
const run = (updates: Record<string, unknown>) => replayGame(JSON.stringify({ ...replay, ...updates }));

describe('replay (D08–D10)', () => {
  it('matches the literal example and respects equal-time array order', () => {
    const game = run({});
    expect(game?.matched).toEqual([0, 11]);
    expect(game?.moves).toBe(1);
    expect(game?.elapsedMs).toBe(800);
  });
  it('closes a mismatch at an action time before activating that card', () => {
    const game = run({ actions: [
      { atMs: 100, index: 0 }, { atMs: 100, index: 1 },
      { atMs: 899, index: 2 }, { atMs: 900, index: 2 },
    ], endMs: 900 });
    expect(game?.moves).toBe(1);
    expect(game?.elapsedMs).toBe(800);
    expect(game?.selection).toEqual({ kind: 'one', index: 2 });
  });
  it('starts elapsed time at the first reveal and caps elapsed independently of timeline', () => {
    expect(run({ actions: [], endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(0);
    expect(run({ actions: [{ atMs: 1000, index: 0 }], endMs: 1250 })?.elapsedMs).toBe(250);
    expect(run({ endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(MAX_ELAPSED_MS);
  });
  it.each([
    { version: 2 }, { extra: 1 }, { boardCode: 'np1-4-0' },
    { endMs: -1 }, { endMs: Number.MAX_SAFE_INTEGER + 1 }, { endMs: 1.5 },
    { actions: [{ atMs: 801, index: 0 }] },
    { actions: [{ atMs: 200, index: 0 }, { atMs: 100, index: 1 }] },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: -1 }] },
    { actions: [{ atMs: 0, index: 0, extra: true }] }, { actions: [{ index: 0 }] },
    { actions: [{ atMs: -1, index: 0 }] }, { actions: null },
  ])('rejects invalid replay %j', updates => {
    expect(run(updates)).toBeNull();
  });
  it('limits action count and encoded bytes', () => {
    const actions = Array.from({ length: MAX_REPLAY_ACTIONS }, () => ({ atMs: 0, index: 0 }));
    expect(run({ actions })).not.toBeNull();
    expect(run({ actions: [...actions, { atMs: 0, index: 0 }] })).toBeNull();
    expect(replayGame(JSON.stringify(replay) + ' '.repeat(MAX_REPLAY_BYTES))).toBeNull();
    expect(replayGame('broken')).toBeNull();
  });
});
