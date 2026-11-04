import { describe, expect, it } from 'vitest';
import { MAX_ELAPSED_MS } from './state.ts';
import { replayGame } from './replay.ts';

describe('replay format', () => {
  it('replays the documented simultaneous match', () => {
    const replay = '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}';
    const result = replayGame(replay);
    expect(result?.matched).toEqual([0, 11]);
    expect(result?.moves).toBe(1);
    expect(result?.elapsedMs).toBe(800);
  });

  it('closes an exact-time mismatch before an equal-time action', () => {
    const replay = JSON.stringify({
      version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 0 }], endMs: 800,
    });
    expect(replayGame(replay)?.selection).toEqual({ kind: 'one', index: 0 });
  });

  it('caps replayed elapsed time while accepting safe large timestamps', () => {
    const replay = JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }], endMs: Number.MAX_SAFE_INTEGER });
    expect(replayGame(replay)?.elapsedMs).toBe(MAX_ELAPSED_MS);
  });

  it('rejects malformed, unordered, oversized, or out-of-range actions', () => {
    const base = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }], endMs: 0 };
    const bad = [
      '{', JSON.stringify({ ...base, extra: 1 }), JSON.stringify({ ...base, actions: [{ ...base.actions[0], extra: 1 }] }),
      JSON.stringify({ ...base, actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }], endMs: 1 }),
      JSON.stringify({ ...base, actions: [{ atMs: 0, index: 16 }] }),
      JSON.stringify({ ...base, endMs: Number.MAX_SAFE_INTEGER + 1 }),
      JSON.stringify({ ...base, actions: Array.from({ length: 10_001 }, () => ({ atMs: 0, index: 0 })) }),
      ' '.repeat(1_048_577),
    ];
    for (const text of bad) expect(replayGame(text)).toBeNull();
  });
});
