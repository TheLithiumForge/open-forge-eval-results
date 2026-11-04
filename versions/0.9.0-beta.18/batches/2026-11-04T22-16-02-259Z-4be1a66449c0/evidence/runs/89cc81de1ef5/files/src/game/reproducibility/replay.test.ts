import { describe, expect, it } from 'vitest';
import { replayGame } from './replay.ts';

describe('replay format v1', () => {
  it('runs the documented equal-time match and counts time after the first reveal', () => {
    const replay = JSON.stringify({
      version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
    });
    const result = replayGame(replay);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({ moves: 1, elapsedMs: 800, matched: [0, 11] });
  });

  it('resolves an 800ms mismatch before an action at the same timestamp', () => {
    const replay = JSON.stringify({
      version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 11 }], endMs: 800,
    });
    expect(replayGame(replay)).toMatchObject({ moves: 1, elapsedMs: 800, matched: [], selection: { kind: 'one', index: 11 } });
  });

  it('rejects unknown fields, invalid order, out-of-range cards and excessive actions', () => {
    const base = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 2, index: 0 }], endMs: 2 };
    expect(replayGame(JSON.stringify({ ...base, extra: 1 }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }] }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 2, index: 16 }] }))).toBeNull();
    expect(replayGame(JSON.stringify({ ...base, actions: Array(10001).fill({ atMs: 0, index: 0 }) }))).toBeNull();
  });
});
