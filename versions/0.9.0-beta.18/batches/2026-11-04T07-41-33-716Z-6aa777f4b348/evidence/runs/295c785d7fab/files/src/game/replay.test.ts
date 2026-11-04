import { describe, expect, it } from 'vitest';
import { MAX_REPLAY_ACTIONS, MAX_REPLAY_BYTES, replayGame } from './replay.ts';
import { MAX_ELAPSED_MS } from './state.ts';

const fixture = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };

describe('version 1 replay', () => {
  it('reproduces the published example preserving equal-time action order', () => {
    const result = replayGame(JSON.stringify(fixture));
    expect(result?.matched).toEqual([0, 11]);
    expect(result?.moves).toBe(1);
    expect(result?.elapsedMs).toBe(800);
    expect(result?.selection.kind).toBe('closed');
  });

  it('closes a mismatch before an action at its exact deadline and ignores earlier actions', () => {
    const result = replayGame(JSON.stringify({ ...fixture, actions: [
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 2 }, { atMs: 800, index: 2 },
    ] }));
    expect(result?.moves).toBe(1);
    expect(result?.selection).toEqual({ kind: 'one', index: 2 });
    const early = replayGame(JSON.stringify({ ...fixture, actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }], endMs: 799 }));
    expect(early?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  });

  it('starts elapsed time at the first reveal, caps it and still resolves later mismatches', () => {
    const late = replayGame(JSON.stringify({ ...fixture, actions: [{ atMs: 100, index: 0 }], endMs: 1200 }));
    expect(late?.elapsedMs).toBe(1100);
    const capped = replayGame(JSON.stringify({ ...fixture, actions: [
      { atMs: 0, index: 0 }, { atMs: MAX_ELAPSED_MS + 1000, index: 1 },
    ], endMs: Number.MAX_SAFE_INTEGER }));
    expect(capped?.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(capped?.selection.kind).toBe('closed');
    const empty = replayGame(JSON.stringify({ ...fixture, actions: [], endMs: Number.MAX_SAFE_INTEGER }));
    expect(empty?.elapsedMs).toBe(0);
    expect(empty?.started).toBe(false);
  });

  it.each([
    { version: 2 }, { extra: true }, { boardCode: 'np1-4-01' }, { endMs: -1 }, { endMs: 0.5 },
    { endMs: Number.MAX_SAFE_INTEGER + 1 }, { endMs: 799, actions: [{ atMs: 800, index: 0 }] },
    { actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }] },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: -1 }] },
    { actions: [{ atMs: 0, index: 0.5 }] }, { actions: [{ atMs: 0, index: 0, extra: true }] },
    { actions: [{ index: 0 }] }, { actions: null },
  ])('rejects invalid replay %j', changes => expect(replayGame(JSON.stringify({ ...fixture, ...changes }))).toBeNull());

  it('enforces action and UTF-8 byte limits and malformed input', () => {
    const action = { atMs: 0, index: 0 };
    expect(replayGame(JSON.stringify({ ...fixture, actions: Array.from({ length: MAX_REPLAY_ACTIONS }, () => action) }))).not.toBeNull();
    expect(replayGame(JSON.stringify({ ...fixture, actions: Array.from({ length: MAX_REPLAY_ACTIONS + 1 }, () => action) }))).toBeNull();
    const text = JSON.stringify(fixture);
    expect(replayGame(text + ' '.repeat(MAX_REPLAY_BYTES - text.length))).not.toBeNull();
    expect(replayGame(text + ' '.repeat(MAX_REPLAY_BYTES - text.length + 1))).toBeNull();
    for (const invalid of ['{', 'null', '{}', '[]']) expect(replayGame(invalid)).toBeNull();
  });
});
