import { describe, expect, it } from 'vitest';
import { replayGame } from './replay.ts';

const base = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 },
  { atMs: 0, index: 11 }], endMs: 800 };

describe('logical replays', () => {
  it('reproduces the documented replay', () => {
    const result = replayGame(JSON.stringify(base));
    expect(result?.matched).toEqual([0, 11]);
    expect(result?.moves).toBe(1);
    expect(result?.elapsedMs).toBe(800);
  });
  it('resolves a mismatch before an equal-time action and preserves array order', () => {
    const result = replayGame(JSON.stringify({ ...base, actions: [{ atMs: 100, index: 0 },
      { atMs: 100, index: 1 }, { atMs: 899, index: 2 }, { atMs: 900, index: 2 },
      { atMs: 900, index: 6 }], endMs: 1000 }));
    expect(result?.moves).toBe(2);
    expect(result?.matched).toEqual([2, 6]);
    expect(result?.selection.kind).toBe('closed');
    expect(result?.elapsedMs).toBe(900);
  });
  it('counts from first reveal and caps elapsed time on a safe-integer timeline', () => {
    expect(replayGame(JSON.stringify({ ...base, actions: [], endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs).toBe(0);
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 1000, index: 0 }],
      endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs).toBe(359999999);
  });
  it.each([{ version: 2 }, { extra: true }, { endMs: -1 }, { endMs: 0.5 }, { endMs: 1e20 },
    { endMs: 10, actions: [{ atMs: 11, index: 0 }] },
    { actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }] },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: 0, extra: 0 }] },
    { actions: [{ atMs: 0.5, index: 0 }] }, { actions: [{ atMs: -1, index: 0 }] },
    { actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay data', patch => {
    expect(replayGame(JSON.stringify({ ...base, ...patch }))).toBeNull();
  });
  it('rejects malformed and oversized files', () => {
    expect(replayGame('{')).toBeNull();
    expect(replayGame(' '.repeat(1048577))).toBeNull();
  });
});
