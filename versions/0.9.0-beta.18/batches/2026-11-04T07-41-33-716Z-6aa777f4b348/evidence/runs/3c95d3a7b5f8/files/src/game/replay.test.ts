import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_ACTION_LIMIT, REPLAY_BYTE_LIMIT } from './replay.ts';
import { MAX_ELAPSED_MS } from './state.ts';

const replay = {
  version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
};

describe('version 1 replays', () => {
  it('runs the documented replay with equal-time actions in array order', () => {
    expect(replayGame(JSON.stringify(replay)))
      .toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, selection: { kind: 'closed' } });
  });

  it('starts elapsed time at the first valid activation', () => {
    expect(replayGame(JSON.stringify({ ...replay, actions: [{ atMs: 200, index: 0 }], endMs: 800 }))?.elapsedMs)
      .toBe(600);
    expect(replayGame(JSON.stringify({ ...replay, actions: [], endMs: 800 }))?.elapsedMs).toBe(0);
  });

  it('resolves exact mismatch expiry before the next action and ignores earlier activation', () => {
    const actions = [
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 },
      { atMs: 799, index: 2 }, { atMs: 800, index: 0 }, { atMs: 800, index: 11 },
    ];
    expect(replayGame(JSON.stringify({ ...replay, actions })))
      .toMatchObject({ moves: 2, matched: [0, 11], elapsedMs: 800, selection: { kind: 'closed' } });
  });

  it('caps elapsed time while accepting safe-integer logical timestamps', () => {
    expect(replayGame(JSON.stringify({ ...replay, endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs)
      .toBe(MAX_ELAPSED_MS);
    const actions = [{ atMs: Number.MAX_SAFE_INTEGER - 100, index: 0 }];
    expect(replayGame(JSON.stringify({ ...replay, actions, endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs)
      .toBe(100);
  });

  it.each([
    { version: 2 }, { extra: true }, { boardCode: 'np1-4-0' },
    { actions: null }, { actions: [{ atMs: 0, index: 16 }] },
    { actions: [{ atMs: 0, index: -1 }] }, { actions: [{ atMs: 0, index: 1.5 }] },
    { actions: [{ atMs: -1, index: 0 }] }, { actions: [{ atMs: 0.5, index: 0 }] },
    { actions: [{ atMs: 0, index: 0, extra: 1 }] },
    { actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 11 }] },
    { endMs: -1 }, { endMs: 0.5 }, { endMs: Number.MAX_SAFE_INTEGER + 1 },
    { actions: [{ atMs: 801, index: 0 }] },
  ])('rejects malformed replay fields %j', (patch) => {
    expect(replayGame(JSON.stringify({ ...replay, ...patch }))).toBeNull();
  });

  it('rejects oversized action lists, files and malformed JSON', () => {
    const actions = Array.from({ length: REPLAY_ACTION_LIMIT + 1 }, () => ({ atMs: 0, index: 0 }));
    expect(replayGame(JSON.stringify({ ...replay, actions }))).toBeNull();
    expect(replayGame(JSON.stringify(replay) + ' '.repeat(REPLAY_BYTE_LIMIT))).toBeNull();
    for (const text of ['null', '{', '[]', '{}']) expect(replayGame(text)).toBeNull();
  });
});
