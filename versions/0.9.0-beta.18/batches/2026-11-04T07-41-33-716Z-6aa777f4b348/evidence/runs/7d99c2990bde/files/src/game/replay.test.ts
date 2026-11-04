import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_ACTION_LIMIT, REPLAY_BYTE_LIMIT } from './replay.ts';
import { MAX_ELAPSED_MS } from './state.ts';

const example = { version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const replay = (value: unknown) => replayGame(JSON.stringify(value));

describe('version 1 replay', () => {
  it('reproduces the documented replay', () => {
    const state = replay(example);
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });

  it('starts the clock with the first action and resolves a miss before an equal-time action', () => {
    const state = replay({ ...example, actions: [
      { atMs: 1000, index: 0 }, { atMs: 1000, index: 1 },
      { atMs: 1799, index: 2 }, { atMs: 1800, index: 2 },
      { atMs: 1800, index: 6 }], endMs: 2000 });
    expect(state?.matched).toEqual([2, 6]);
    expect(state?.moves).toBe(2);
    expect(state?.elapsedMs).toBe(1000);
    expect(state?.selection).toEqual({ kind: 'closed' });
  });

  it('handles safe integer timestamps, clock caps and empty action lists', () => {
    expect(replay({ ...example, endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(replay({ ...example, actions: [], endMs: Number.MAX_SAFE_INTEGER })?.started).toBe(false);
    expect(replay({ ...example, actions: [{ atMs: Number.MAX_SAFE_INTEGER, index: 0 }],
      endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(0);
  });

  it.each([
    { ...example, extra: 1 }, { ...example, version: 2 }, { ...example, boardCode: 'np1-4-0' },
    { ...example, actions: [{ atMs: 0, index: 16 }] },
    { ...example, actions: [{ atMs: 0, index: -1 }] },
    { ...example, actions: [{ atMs: 0, index: 1.5 }] },
    { ...example, actions: [{ atMs: 0, index: 0, extra: 1 }] },
    { ...example, actions: [{ atMs: -1, index: 0 }] },
    { ...example, actions: [{ atMs: 0.5, index: 0 }] },
    { ...example, actions: [{ atMs: 10, index: 0 }, { atMs: 9, index: 1 }] },
    { ...example, actions: [{ atMs: 801, index: 0 }] },
    { ...example, endMs: -1 }, { ...example, endMs: 0.5 },
    { ...example, endMs: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects malformed replay %j', value => expect(replay(value)).toBeNull());

  it('rejects missing fields, malformed JSON, action overflow and byte overflow', () => {
    for (const key of Object.keys(example)) {
      const copy: Record<string, unknown> = { ...example };
      delete copy[key];
      expect(replay(copy)).toBeNull();
    }
    expect(replayGame('{')).toBeNull();
    expect(replayGame('null')).toBeNull();
    expect(replay({ ...example, actions: Array.from({ length: REPLAY_ACTION_LIMIT + 1 }, () =>
      ({ atMs: 0, index: 0 })) })).toBeNull();
    const text = JSON.stringify(example);
    expect(replayGame(text + ' '.repeat(REPLAY_BYTE_LIMIT - text.length))).not.toBeNull();
    expect(replayGame(text + ' '.repeat(REPLAY_BYTE_LIMIT - text.length + 1))).toBeNull();
  });
});
