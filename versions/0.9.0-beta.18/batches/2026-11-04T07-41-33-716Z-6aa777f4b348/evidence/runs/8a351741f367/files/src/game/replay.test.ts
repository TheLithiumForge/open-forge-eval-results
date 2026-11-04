import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_MAX_ACTIONS, REPLAY_MAX_BYTES } from './replay.ts';
import { MAX_ELAPSED_MS } from './transitions.ts';

const base = { version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0 };

describe('version 1 replay', () => {
  it('reproduces the documented replay', () => {
    const state = replayGame(JSON.stringify({ ...base,
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });

  it('resolves a mismatch before an action at precisely its deadline', () => {
    const actions = [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 },
      { atMs: 799, index: 2 }, { atMs: 800, index: 2 }, { atMs: 800, index: 6 }];
    const state = replayGame(JSON.stringify({ ...base, actions, endMs: 800 }));
    expect(state?.matched).toEqual([2, 6]);
    expect(state?.moves).toBe(2);
    expect(state?.selection).toEqual({ kind: 'closed' });
    expect(state?.elapsedMs).toBe(800);
  });

  it('keeps equal-time action order and ignores repeated activations', () => {
    const actions = [{ atMs: 1000, index: 0 }, { atMs: 1000, index: 0 }, { atMs: 1000, index: 11 }];
    const state = replayGame(JSON.stringify({ ...base, actions, endMs: 1100 }));
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(100);
  });

  it('allows large safe timestamps and caps only the elapsed clock', () => {
    const state = replayGame(JSON.stringify({ ...base,
      actions: [{ atMs: 1, index: 0 }], endMs: Number.MAX_SAFE_INTEGER }));
    expect(state?.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(replayGame(JSON.stringify({ ...base, endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs).toBe(0);
  });

  it.each([
    { ...base, extra: true }, { ...base, version: 2 }, { ...base, boardCode: 'np1-4-0' },
    { ...base, endMs: -1 }, { ...base, endMs: Number.MAX_SAFE_INTEGER + 1 },
    { ...base, actions: [{ atMs: 1, index: 0 }], endMs: 0 },
    { ...base, actions: [{ atMs: 0, index: 16 }] },
    { ...base, actions: [{ atMs: 0, index: -1 }] },
    { ...base, actions: [{ atMs: 0, index: 0.5 }] },
    { ...base, actions: [{ atMs: 0.1, index: 0 }], endMs: 1 },
    { ...base, actions: [{ atMs: 0, index: 0, extra: true }] },
    { ...base, actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], endMs: 2 },
    { ...base, actions: Array.from({ length: REPLAY_MAX_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })) },
    { ...base, actions: null },
  ])('rejects invalid input %#', (value) => {
    expect(replayGame(JSON.stringify(value))).toBeNull();
  });

  it('enforces inclusive action and byte limits', () => {
    expect(replayGame(JSON.stringify({ ...base,
      actions: Array.from({ length: REPLAY_MAX_ACTIONS }, () => ({ atMs: 0, index: 0 })) }))).not.toBeNull();
    const text = JSON.stringify(base);
    expect(replayGame(text.padEnd(REPLAY_MAX_BYTES, ' '))).not.toBeNull();
    expect(replayGame(text.padEnd(REPLAY_MAX_BYTES + 1, ' '))).toBeNull();
    expect(replayGame('{')).toBeNull();
  });
});
