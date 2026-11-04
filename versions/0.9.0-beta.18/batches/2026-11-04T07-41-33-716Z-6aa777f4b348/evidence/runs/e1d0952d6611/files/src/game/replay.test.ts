import { describe, expect, it } from 'vitest';
import { replayGame } from './replay.ts';
import { isWon } from './transitions.ts';

const replay = (actions: readonly object[], endMs: number) => JSON.stringify({
  version: 1, boardCode: 'np1-4-1', actions, endMs,
});

describe('version 1 timed replays', () => {
  it('matches the documented replay and starts elapsed time on first reveal', () => {
    const state = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], 800));
    expect(state).not.toBeNull();
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
    const delayed = replayGame(replay([{ atMs: 500, index: 0 }, { atMs: 700, index: 11 }], 900));
    expect(delayed?.elapsedMs).toBe(400);
  });

  it('resolves a timeout before equal-time actions and preserves equal-time array order', () => {
    const state = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 1 },
      { atMs: 400, index: 2 }, { atMs: 800, index: 2 }], 800));
    expect(state?.moves).toBe(1);
    expect(state?.selection).toEqual({ kind: 'one', index: 2 });
    const simultaneous = replayGame(replay([{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], 0));
    expect(simultaneous?.matched).toEqual([0, 11]);
  });

  it('stops clock when won and rejects invalid formats and limits', () => {
    const actions: object[] = [];
    const deck = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
    for (let face = 0; face < 8; face += 1) {
      const pair = deck.flatMap((value, index) => value === face ? [index] : []);
      const first = pair[0];
      const second = pair[1];
      if (first !== undefined && second !== undefined) {
        actions.push({ atMs: face, index: first }, { atMs: face, index: second });
      }
    }
    const win = replayGame(replay(actions, 10_000));
    expect(win).not.toBeNull();
    if (win !== null) { expect(isWon(win)).toBe(true); expect(win.elapsedMs).toBe(7); }
    expect(replayGame(replay([{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], 2))).toBeNull();
    expect(replayGame(replay([{ atMs: 0, index: 20 }], 0))).toBeNull();
    expect(replayGame('é'.repeat(524_289))).toBeNull();
    expect(replayGame(replay(Array.from({ length: 10_001 }, () => ({ atMs: 0, index: 0 })), 0))).toBeNull();
  });

  it('caps replay elapsed time safely at the game limit', () => {
    const state = replayGame(replay([{ atMs: 0, index: 0 }], 400_000_000));
    expect(state?.elapsedMs).toBe(359_999_999);
  });

  it('rejects unknown keys, unsupported versions and unsafe time fields', () => {
    const base = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }], endMs: 0 };
    const rejected = [
      { ...base, unknown: true },
      { ...base, version: 2 },
      { ...base, actions: [{ atMs: 0, index: 0, hidden: true }] },
      { ...base, actions: [{ atMs: -1, index: 0 }] },
      { ...base, actions: [{ atMs: Number.MAX_SAFE_INTEGER + 1, index: 0 }] },
      { ...base, endMs: -1 },
      { ...base, endMs: Number.MAX_SAFE_INTEGER + 1 },
      { ...base, endMs: 0, actions: [{ atMs: 1, index: 0 }] },
      { ...base, boardCode: 'np1-4-1\n' },
    ];
    for (const value of rejected) expect(replayGame(JSON.stringify(value))).toBeNull();
  });
});
