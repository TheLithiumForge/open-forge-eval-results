import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_MAX_ACTIONS, REPLAY_MAX_BYTES } from './replay.ts';
import { MAX_ELAPSED_MS } from './state.ts';
import { parseLimitedJson } from './validation.ts';

const base = { version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0 };

describe('version 1 replays', () => {
  it('matches the documented example and starts elapsed time at the first reveal', () => {
    const state = replayGame(JSON.stringify({ ...base,
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 500, index: 0 }], endMs: 800 }))?.elapsedMs).toBe(300);
    expect(replayGame(JSON.stringify({ ...base, endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs).toBe(0);
  });

  it('resolves a mismatch before an equal-time action and preserves array order', () => {
    const actions = [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 },
      { atMs: 799, index: 2 }, { atMs: 800, index: 1 }, { atMs: 800, index: 9 }];
    const state = replayGame(JSON.stringify({ ...base, actions, endMs: 800 }));
    expect(state?.moves).toBe(2);
    expect(state?.matched).toEqual([1, 9]);
    expect(state?.selection).toEqual({ kind: 'closed' });
    expect(replayGame(JSON.stringify({ ...base, actions: actions.slice(0, 4), endMs: 800 }))?.selection)
      .toEqual({ kind: 'one', index: 1 });
  });

  it('accepts safe integer timeline limits while capping elapsed time', () => {
    const state = replayGame(JSON.stringify({ ...base,
      actions: [{ atMs: 0, index: 0 }], endMs: Number.MAX_SAFE_INTEGER }));
    expect(state?.elapsedMs).toBe(MAX_ELAPSED_MS);
  });

  it.each([
    { ...base, extra: true }, { ...base, version: 2 }, { ...base, boardCode: 'bad' },
    { ...base, actions: [{ atMs: 0, index: 0, extra: true }] },
    { ...base, actions: [{ atMs: 0, index: 16 }] }, { ...base, actions: [{ atMs: 0, index: -1 }] },
    { ...base, actions: [{ atMs: 0, index: 0.5 }] }, { ...base, actions: [{ atMs: -1, index: 0 }] },
    { ...base, actions: [{ atMs: 0.5, index: 0 }] }, { ...base, actions: [{ atMs: 1, index: 0 }] },
    { ...base, actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }], endMs: 1 },
    { ...base, endMs: -1 }, { ...base, endMs: 0.5 }, { ...base, endMs: Number.MAX_SAFE_INTEGER + 1 },
    { ...base, actions: [{}] }, { ...base, actions: null },
  ])('rejects malformed replay %#', (value) => {
    expect(replayGame(JSON.stringify(value))).toBeNull();
  });

  it('enforces exact fields, JSON, byte and action limits', () => {
    for (const text of ['{', 'null', '[]', '{}', JSON.stringify({ ...base, endMs: undefined })]) {
      expect(replayGame(text)).toBeNull();
    }
    const actions = Array.from({ length: REPLAY_MAX_ACTIONS }, () => ({ atMs: 0, index: 0 }));
    expect(replayGame(JSON.stringify({ ...base, actions }))).not.toBeNull();
    expect(replayGame(JSON.stringify({ ...base, actions: [...actions, { atMs: 0, index: 0 }] }))).toBeNull();
    const text = JSON.stringify(base);
    expect(replayGame(' '.repeat(REPLAY_MAX_BYTES - text.length) + text)).not.toBeNull();
    expect(replayGame(' '.repeat(REPLAY_MAX_BYTES - text.length + 1) + text)).toBeNull();
    expect(parseLimitedJson('"é"', 4)).toBe('é');
    expect(parseLimitedJson('"é"', 3)).toBeNull();
  });
});
