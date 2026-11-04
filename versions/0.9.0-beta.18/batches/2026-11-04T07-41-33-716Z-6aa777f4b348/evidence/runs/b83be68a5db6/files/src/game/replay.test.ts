import { describe, expect, it } from 'vitest';
import { replayGame, replayByteLimit, replayActionLimit } from './replay.ts';
import { elapsedCap } from './turn.ts';

const base = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
function replay(change: Record<string, unknown>) { return replayGame(JSON.stringify({ ...base, ...change })); }

describe('logical replay', () => {
  it('reproduces the literal replay in array order', () => {
    const game = replay({});
    expect(game?.matched).toEqual([0, 11]);
    expect(game?.moves).toBe(1);
    expect(game?.elapsedMs).toBe(800);
  });
  it('resolves timeouts before actions at the exact deadline', () => {
    const game = replay({ actions: [{ atMs: 100, index: 0 }, { atMs: 100, index: 1 },
      { atMs: 899, index: 2 }, { atMs: 900, index: 2 }, { atMs: 900, index: 6 }], endMs: 900 });
    expect(game?.matched).toEqual([2, 6]);
    expect(game?.moves).toBe(2);
    expect(game?.elapsedMs).toBe(800);
  });
  it('starts at the first reveal, caps elapsed and permits a safe integer timeline', () => {
    expect(replay({ actions: [], endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(0);
    expect(replay({ endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(elapsedCap);
    expect(replay({ actions: [{ atMs: 1000, index: 0 }], endMs: 1200 })?.elapsedMs).toBe(200);
  });
  it.each([
    { version: 2 }, { extra: 1 }, { boardCode: 'np1-04-1' }, { endMs: -1 }, { endMs: 0.5 },
    { endMs: Number.MAX_SAFE_INTEGER + 1 }, { endMs: '800' }, { actions: null },
    { actions: [{ atMs: 801, index: 0 }] }, { actions: [{ atMs: 0, index: 16 }] },
    { actions: [{ atMs: 0, index: -1 }] }, { actions: [{ atMs: 0, index: 0, extra: 1 }] },
    { actions: [{ atMs: 0.5, index: 0 }] }, { actions: [{ atMs: 10, index: 0 }, { atMs: 9, index: 1 }] },
    { actions: Array.from({ length: replayActionLimit + 1 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay fields %j', change => { expect(replay(change)).toBeNull(); });
  it('enforces JSON and UTF-8 length limits', () => {
    expect(replayGame('{')).toBeNull();
    expect(replayGame('[]')).toBeNull();
    const text = JSON.stringify(base);
    expect(replayGame(text.padEnd(replayByteLimit, ' '))).not.toBeNull();
    expect(replayGame(text.padEnd(replayByteLimit + 1, ' '))).toBeNull();
  });
});
