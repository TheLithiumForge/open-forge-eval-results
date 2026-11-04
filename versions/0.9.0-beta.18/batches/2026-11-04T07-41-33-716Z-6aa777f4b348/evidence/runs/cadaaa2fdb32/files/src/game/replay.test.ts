import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_ACTIONS, REPLAY_BYTES } from './replay.ts';
import { MAX_ELAPSED_MS } from './rules.ts';

const base = { version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const replay = (overrides: Record<string, unknown>) => replayGame(JSON.stringify({ ...base, ...overrides }));

describe('logical replay', () => {
  it('reproduces the documented result', () => {
    const state = replay({});
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });
  it('resolves an exact-time mismatch before activation, preserving equal-time order', () => {
    const state = replay({ actions: [
      { atMs: 1000, index: 0 }, { atMs: 1000, index: 1 },
      { atMs: 1799, index: 2 }, { atMs: 1800, index: 0 }, { atMs: 1800, index: 11 },
    ], endMs: 1800 });
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(2);
    expect(state?.elapsedMs).toBe(800);
  });
  it('ignores repeats, delays clock start and caps elapsed without capping timeline', () => {
    expect(replay({ actions: [], endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(0);
    const state = replay({ actions: [{ atMs: 12345, index: 0 }, { atMs: 12345, index: 0 }],
      endMs: Number.MAX_SAFE_INTEGER });
    expect(state?.moves).toBe(0);
    expect(state?.selection).toEqual({ kind: 'one', index: 0 });
    expect(state?.elapsedMs).toBe(MAX_ELAPSED_MS);
  });
  it.each([
    { version: 2 }, { extra: 1 }, { boardCode: 'np1-4-0' }, { endMs: -1 },
    { endMs: 0.5 }, { endMs: Number.MAX_SAFE_INTEGER + 1 },
    { actions: [{ atMs: 1, index: 0 }], endMs: 0 },
    { actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }] },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: 0, extra: 0 }] },
    { actions: [{ atMs: 0.5, index: 0 }] }, { actions: [{ index: 0 }] },
    { actions: Array.from({ length: REPLAY_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay %j', invalid => expect(replay(invalid)).toBeNull());
  it('rejects byte overflow and malformed JSON', () => {
    expect(replayGame(' '.repeat(REPLAY_BYTES) + JSON.stringify(base))).toBeNull();
    expect(replayGame('null')).toBeNull();
    expect(replayGame('{')).toBeNull();
  });
});
