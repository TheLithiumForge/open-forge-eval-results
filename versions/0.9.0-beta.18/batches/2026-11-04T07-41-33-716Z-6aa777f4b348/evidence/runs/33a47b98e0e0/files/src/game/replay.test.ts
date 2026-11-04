import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_ACTION_LIMIT, REPLAY_BYTE_LIMIT } from './replay.ts';
import { matchedPairCount } from './state.ts';

function replay(actions: unknown, endMs: number, boardCode: unknown = 'np1-4-1'): string {
  return JSON.stringify({ version: 1, boardCode, actions, endMs });
}

describe('version 1 replay validation and execution', () => {
  it('runs the documented equal-time matching example', () => {
    const state = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], 800));
    expect(state).not.toBeNull();
    expect(state).toMatchObject({ moves: 1, elapsedMs: 800, started: true });
    if (state !== null) expect(matchedPairCount(state)).toBe(1);
  });

  it('resolves an 800ms mismatch before an action at that exact time', () => {
    const before = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 2 },
    ], 799));
    expect(before?.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    const exact = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 },
    ], 800));
    expect(exact?.selection).toEqual({ kind: 'one', index: 2 });
    expect(exact).toMatchObject({ moves: 1, elapsedMs: 800 });
  });

  it('preserves equal-time action order and ignores blocked activations', () => {
    const repeated = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 0 }, { atMs: 0, index: 11 },
    ], 0));
    expect(repeated).toMatchObject({ moves: 1, matched: [0, 11] });
    const blocked = replayGame(replay([
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 100, index: 2 },
    ], 100));
    expect(blocked?.selection).toMatchObject({ kind: 'mismatch', remainingMs: 700 });
    expect(blocked).toMatchObject({ moves: 1, elapsedMs: 100 });
  });

  it('caps elapsed time without overflowing safe logical timestamps', () => {
    const maxSafe = Number.MAX_SAFE_INTEGER;
    const lateFirstReveal = replayGame(replay([{ atMs: maxSafe, index: 0 }, { atMs: maxSafe, index: 11 }], maxSafe));
    expect(lateFirstReveal).toMatchObject({ moves: 1, elapsedMs: 0, matched: [0, 11] });
    const capped = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }], maxSafe));
    expect(capped?.selection.kind).toBe('closed');
    expect(capped?.elapsedMs).toBe(359_999_999);
  });

  it('rejects unsupported formats, extra fields, bad times and invalid indices', () => {
    expect(replayGame('{')).toBeNull();
    expect(replayGame(' '.repeat(REPLAY_BYTE_LIMIT + 1))).toBeNull();
    expect(replayGame(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0, extra: 1 }))).toBeNull();
    expect(replayGame(replay([{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], 2))).toBeNull();
    expect(replayGame(replay([{ atMs: Number.MAX_SAFE_INTEGER + 1, index: 0 }], 0))).toBeNull();
    expect(replayGame(replay([{ atMs: 0, index: 16 }], 0))).toBeNull();
    expect(replayGame(replay([], -1))).toBeNull();
    expect(replayGame(replay([{ atMs: 2, index: 0 }], 1))).toBeNull();
    expect(replayGame(replay([], 0, 'np1-4-1\n'))).toBeNull();
    expect(replayGame(JSON.stringify({ version: 2, boardCode: 'np1-4-1', actions: [], endMs: 0 }))).toBeNull();
  });

  it('enforces both action count and action object key limits', () => {
    const tooMany = Array.from({ length: REPLAY_ACTION_LIMIT + 1 }, () => ({ atMs: 0, index: 0 }));
    expect(replayGame(replay(tooMany, 0))).toBeNull();
    expect(replayGame(replay([{ atMs: 0, index: 0, extra: 1 }], 0))).toBeNull();
    expect(replayGame(replay([{ atMs: -1, index: 0 }], 0))).toBeNull();
  });
});
