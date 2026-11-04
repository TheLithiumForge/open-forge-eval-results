import { describe, expect, it } from 'vitest';
import { replayGame, MAX_ACTIONS, REPLAY_BYTES } from './replay.ts';
import { KIND, MAX_ELAPSED_MS } from './state.ts';
const example = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const replay = (changes: Record<string, unknown>) => replayGame(JSON.stringify({ ...example, ...changes }));

describe('replay timeline and validation (D08–D10)', () => {
  it('reproduces the published replay', () => {
    const game = replay({});
    expect(game?.matched).toEqual([0, 11]);
    expect(game?.moves).toBe(1);
    expect(game?.elapsedMs).toBe(800);
  });
  it('resolves a mismatch before equal-time actions', () => {
    const game = replay({ actions: [{ atMs: 100, index: 0 }, { atMs: 100, index: 1 },
      { atMs: 899, index: 11 }, { atMs: 900, index: 0 }, { atMs: 900, index: 11 }], endMs: 900 });
    expect(game?.moves).toBe(2);
    expect(game?.matched).toEqual([0, 11]);
    expect(game?.elapsedMs).toBe(800);
  });
  it('keeps array order and ignores repeated activations', () => {
    const game = replay({ actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 0 }, { atMs: 0, index: 1 }], endMs: 799 });
    expect(game?.selection).toEqual({ kind: KIND.mismatch, first: 0, second: 1, remainingMs: 1 });
    expect(game?.moves).toBe(1);
  });
  it('starts its elapsed clock only at the first valid activation', () => {
    expect(replay({ actions: [], endMs: 99999 })?.elapsedMs).toBe(0);
    expect(replay({ actions: [{ atMs: 10000, index: 0 }], endMs: 11000 })?.elapsedMs).toBe(1000);
  });
  it('caps elapsed time while accepting safe timestamps', () => {
    expect(replay({ endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(MAX_ELAPSED_MS);
  });
  it.each([
    { version: 2 }, { extra: 1 }, { boardCode: 'np1-4-01' }, { actions: null },
    { endMs: -1 }, { endMs: 1.5 }, { endMs: Number.MAX_SAFE_INTEGER + 1 },
    { actions: [{ atMs: 1, index: 0 }], endMs: 0 },
    { actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 11 }] },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: -1, index: 0 }] },
    { actions: [{ atMs: 0, index: 0, extra: 1 }] }, { actions: [{ atMs: 0.5, index: 0 }] },
    { actions: [{ atMs: 0, index: '0' }] }, { actions: [null] },
    { actions: Array.from({ length: MAX_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay data', changes => { expect(replay(changes)).toBeNull(); });
  it('enforces action and byte limits', () => {
    expect(replay({ actions: Array.from({ length: MAX_ACTIONS }, () => ({ atMs: 0, index: 0 })) })).not.toBeNull();
    const text = JSON.stringify(example);
    expect(replayGame(text.padEnd(REPLAY_BYTES, ' '))).not.toBeNull();
    expect(replayGame(text.padEnd(REPLAY_BYTES + 1, ' '))).toBeNull();
    expect(replayGame('{')).toBeNull();
  });
});
