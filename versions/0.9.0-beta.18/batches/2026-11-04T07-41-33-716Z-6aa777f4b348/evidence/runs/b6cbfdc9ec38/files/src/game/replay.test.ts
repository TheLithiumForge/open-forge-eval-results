import { describe, expect, it } from 'vitest';
import { MAX_REPLAY_ACTIONS, REPLAY_BYTE_LIMIT, replayGame } from './replay.ts';
import { MAX_ELAPSED_MS } from './state.ts';

const replay = (changes: Record<string, unknown> = {}): string => JSON.stringify({
  version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
  ...changes,
});

describe('replay version 1', () => {
  it('matches the specification example, preserving equal-time array order', () => {
    expect(replayGame(replay())).toMatchObject({
      matched: [0, 11], moves: 1, elapsedMs: 800, selection: { kind: 'closed' },
    });
  });

  it('resolves an exact-time mismatch before activating the next card', () => {
    const actions = [
      { atMs: 0, index: 0 }, { atMs: 0, index: 1 },
      { atMs: 799, index: 2 }, { atMs: 800, index: 2 }, { atMs: 800, index: 6 },
    ];
    expect(replayGame(replay({ actions }))).toMatchObject({
      matched: [2, 6], moves: 2, elapsedMs: 800, selection: { kind: 'closed' },
    });
  });

  it('ignores invalid activations by the rules and starts elapsed at first reveal', () => {
    expect(replayGame(replay({
      actions: [{ atMs: 200, index: 0 }, { atMs: 300, index: 0 }, { atMs: 400, index: 11 }],
      endMs: 1000,
    }))).toMatchObject({ moves: 1, elapsedMs: 800, matched: [0, 11] });
    expect(replayGame(replay({ actions: [], endMs: Number.MAX_SAFE_INTEGER })))
      .toMatchObject({ started: false, elapsedMs: 0, moves: 0 });
  });

  it('accepts safe integer timelines beyond the capped elapsed clock', () => {
    expect(replayGame(replay({ endMs: Number.MAX_SAFE_INTEGER })))
      .toMatchObject({ elapsedMs: MAX_ELAPSED_MS });
  });

  it.each([
    { version: 2 }, { extra: 0 }, { boardCode: 'np1-4-01' }, { endMs: -1 },
    { endMs: 0.5 }, { endMs: Number.MAX_SAFE_INTEGER + 1 }, { actions: {} },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: -1 }] },
    { actions: [{ atMs: 0.5, index: 0 }] }, { actions: [{ atMs: 0, index: 0.5 }] },
    { actions: [{ atMs: 0, index: 0, extra: true }] },
    { actions: [{ atMs: 5, index: 0 }, { atMs: 4, index: 1 }] },
    { actions: [{ atMs: 801, index: 0 }] },
    { actions: Array.from({ length: MAX_REPLAY_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay data', (changes) => {
    expect(replayGame(replay(changes))).toBeNull();
  });

  it('rejects malformed and oversized JSON', () => {
    for (const invalid of ['', '{', 'null', '{}', '[]', ' '.repeat(REPLAY_BYTE_LIMIT) + replay()]) {
      expect(replayGame(invalid)).toBeNull();
    }
  });
});
