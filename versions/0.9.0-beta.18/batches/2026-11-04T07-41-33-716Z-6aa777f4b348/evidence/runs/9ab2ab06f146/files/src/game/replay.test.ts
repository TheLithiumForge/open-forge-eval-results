import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_BYTES } from './replay.ts';

const example = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const run = (changes: Record<string, unknown>) => replayGame(JSON.stringify({ ...example, ...changes }));

describe('replay version 1', () => {
  it('matches the published example', () => {
    expect(run({})).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, selection: { kind: 'closed' } });
  });
  it('resolves an exact-boundary mismatch before the next action, preserving equal-time order', () => {
    const actions = [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 11 },
      { atMs: 800, index: 0 }, { atMs: 800, index: 11 }];
    expect(run({ actions })).toMatchObject({ moves: 2, matched: [0, 11], selection: { kind: 'closed' } });
  });
  it('excludes pre-start time, ignores activations and caps only elapsed time', () => {
    expect(run({ actions: [{ atMs: 5000, index: 0 }, { atMs: 5000, index: 0 }], endMs: 6000 }))
      .toMatchObject({ moves: 0, elapsedMs: 1000 });
    expect(run({ endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(359999999);
    expect(run({ actions: [], endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(0);
  });
  it.each([
    { version: 2 }, { boardCode: 'np1-4-0' }, { extra: true }, { actions: null },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: -1, index: 0 }] },
    { actions: [{ atMs: 0, index: 0, extra: 1 }] }, { actions: [{ atMs: 0.5, index: 0 }] },
    { actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 11 }] },
    { actions: [{ atMs: 801, index: 0 }] }, { endMs: -1 }, { endMs: 0.5 },
    { endMs: 9007199254740992 }, { actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay: %j', changes => expect(run(changes)).toBeNull());
  it('accepts 10000 actions and rejects malformed or oversized JSON', () => {
    expect(run({ actions: Array.from({ length: 10000 }, () => ({ atMs: 0, index: 0 })) })).not.toBeNull();
    expect(replayGame('{')).toBeNull();
    const text = JSON.stringify(example);
    expect(replayGame(text + ' '.repeat(REPLAY_BYTES - text.length))).not.toBeNull();
    expect(replayGame(text + ' '.repeat(REPLAY_BYTES - text.length + 1))).toBeNull();
  });
});
