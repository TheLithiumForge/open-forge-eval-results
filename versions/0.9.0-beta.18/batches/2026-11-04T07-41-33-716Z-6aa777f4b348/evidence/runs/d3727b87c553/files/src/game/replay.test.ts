import { describe, expect, it } from 'vitest';
import { replayGame, MAX_REPLAY_ACTIONS } from './replay.ts';
import { MAX_ELAPSED_MS } from './transitions.ts';

const base = { version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0 };
const replay = (patch: Record<string, unknown>) => replayGame(JSON.stringify({ ...base, ...patch }));

describe('replay', () => {
  it('matches the documented replay literal', () => {
    expect(replay({ actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }))
      .toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, started: true, selection: { kind: 'closed' } });
  });
  it('resolves a mismatch before an equal-time activation, preserving array order', () => {
    const actions = [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 2 },
      { atMs: 800, index: 0 }, { atMs: 800, index: 11 }];
    expect(replay({ actions, endMs: 800 })).toMatchObject({ moves: 2, matched: [0, 11], selection: { kind: 'closed' }, elapsedMs: 800 });
  });
  it('starts elapsed time at the first valid action and caps it independently of the timeline', () => {
    expect(replay({ endMs: Number.MAX_SAFE_INTEGER })).toMatchObject({ elapsedMs: 0, started: false });
    expect(replay({ actions: [{ atMs: 1000, index: 0 }, { atMs: 1000, index: 0 }], endMs: 2000 }))
      .toMatchObject({ moves: 0, elapsedMs: 1000, selection: { kind: 'one', index: 0 } });
    expect(replay({ actions: [{ atMs: 0, index: 0 }, { atMs: MAX_ELAPSED_MS + 1, index: 1 }], endMs: MAX_ELAPSED_MS + 801 }))
      .toMatchObject({ elapsedMs: MAX_ELAPSED_MS, selection: { kind: 'closed' } });
  });
  it('stops at completion even if the logical timeline continues', () => {
    const pairs = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]];
    const actions = pairs.flatMap((indices, i) => indices.map((index) => ({ atMs: i * 100, index })));
    expect(replay({ actions, endMs: 10000 })).toMatchObject({ elapsedMs: 700, moves: 8 });
  });
  it.each([
    { version: 2 }, { extra: true }, { boardCode: ' np1-4-1' }, { endMs: -1 }, { endMs: 0.5 },
    { endMs: Number.MAX_SAFE_INTEGER + 1 }, { actions: {} }, { actions: [{ atMs: 0, index: 16 }] },
    { actions: [{ atMs: 0, index: -1 }] }, { actions: [{ atMs: 0.5, index: 0 }] },
    { actions: [{ atMs: 0, index: 0, extra: true }] }, { actions: [{ index: 0 }] },
    { actions: [{ atMs: 1, index: 0 }] }, { actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], endMs: 2 },
  ])('rejects invalid replay %j', (patch) => expect(replay(patch)).toBeNull());
  it('rejects too many actions', () => {
    expect(replay({ actions: Array.from({ length: MAX_REPLAY_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })) })).toBeNull();
  });
  it('rejects malformed and oversized input', () => {
    for (const text of ['{', 'null', '{}', '[]', ' '.repeat(1048576) + JSON.stringify(base)]) expect(replayGame(text)).toBeNull();
  });
});
