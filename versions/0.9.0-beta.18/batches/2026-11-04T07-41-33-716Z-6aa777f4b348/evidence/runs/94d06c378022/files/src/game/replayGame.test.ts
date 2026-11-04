import { describe, expect, it } from 'vitest';
import { decodeReplay, MAX_REPLAY_ACTIONS } from './replayFormat.ts';
import { replayGame } from './replayGame.ts';

describe('version 1 replay', () => {
  it('replays the documented equal-time match and advances the clock', () => {
    const result = replayGame(JSON.stringify({
      version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800
    }));
    expect(result).not.toBeNull();
    expect(result?.matched).toEqual([0, 11]);
    expect(result?.moves).toBe(1);
    expect(result?.elapsedMs).toBe(800);
    expect(result?.selection).toEqual({ kind: 'closed' });
  });

  it('closes a miss before an action at the exact 800ms boundary', () => {
    const result = replayGame(JSON.stringify({
      version: 1,
      boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 11 }],
      endMs: 800
    }));
    expect(result?.selection).toEqual({ kind: 'one', index: 11 });
    expect(result?.moves).toBe(1);
    expect(result?.elapsedMs).toBe(800);
  });

  it('caps elapsed time from the first valid activation', () => {
    const result = replayGame(JSON.stringify({
      version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }], endMs: 400_000_000
    }));
    expect(result?.elapsedMs).toBe(359_999_999);
  });

  it('rejects invalid fields, ordering, ranges, sizes and versions', () => {
    const base = { version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0 };
    const invalid = [
      { ...base, extra: true },
      { ...base, version: 2 },
      { ...base, boardCode: 'np1-04-1' },
      { ...base, endMs: -1 },
      { ...base, actions: [{ atMs: 0, index: 16 }] },
      { ...base, actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }] },
      { ...base, actions: [{ atMs: 1, index: 0 }], endMs: 0 },
      { ...base, actions: [{ atMs: 0, index: 0, extra: 1 }] }
    ];
    for (const value of invalid) expect(decodeReplay(JSON.stringify(value))).toBeNull();
    const tooMany = Array.from({ length: MAX_REPLAY_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 }));
    expect(decodeReplay(JSON.stringify({ ...base, actions: tooMany }))).toBeNull();
    expect(replayGame('{broken')).toBeNull();
    const empty = replayGame(JSON.stringify(base));
    expect(empty?.started).toBe(false);
  });
});
