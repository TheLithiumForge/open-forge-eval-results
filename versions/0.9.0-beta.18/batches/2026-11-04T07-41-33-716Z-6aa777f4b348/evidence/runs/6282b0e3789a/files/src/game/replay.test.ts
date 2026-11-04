import { describe, expect, it } from 'vitest';
import { replayGame } from './replay.ts';
import { MAX_ELAPSED_MS } from './state.ts';

const sample = {
  version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
};
const replay = (patch: Record<string, unknown> = {}) => replayGame(JSON.stringify({ ...sample, ...patch }));

describe('replay version 1', () => {
  it('replays the documented equal-time matching example in array order', () => {
    expect(replay()).toMatchObject({
      matched: [0, 11], moves: 1, elapsedMs: 800, selection: { kind: 'closed' }, started: true,
    });
  });

  it('starts the elapsed clock at the first valid action rather than timeline zero', () => {
    expect(replay({ actions: [{ atMs: 5000, index: 0 }], endMs: 5700 })?.elapsedMs).toBe(700);
    expect(replay({ actions: [], endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(0);
  });

  it('resolves mismatch expiration before an equal-time action', () => {
    const actions = [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 }];
    expect(replay({ actions, endMs: 800 })).toMatchObject({
      moves: 1, elapsedMs: 800, selection: { kind: 'one', index: 2 },
    });
    expect(replay({ actions: [...actions.slice(0, 2), { atMs: 799, index: 2 }], endMs: 800 }))
      .toMatchObject({ moves: 1, selection: { kind: 'closed' } });
  });

  it('includes ignored repeated and matched activations without extra moves', () => {
    const actions = [...sample.actions.slice(0, 1), { atMs: 0, index: 0 },
      { atMs: 0, index: 11 }, { atMs: 1, index: 11 }];
    expect(replay({ actions })?.moves).toBe(1);
  });

  it('caps elapsed time while accepting safe-integer logical timestamps', () => {
    expect(replay({ endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(MAX_ELAPSED_MS);
    const actions = [{ atMs: Number.MAX_SAFE_INTEGER - 1, index: 0 }];
    expect(replay({ actions, endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(1);
  });

  it('stops time on the winning activation', () => {
    const pairs = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]];
    const actions = pairs.flatMap((pair, time) => pair.map(index => ({ atMs: time, index })));
    expect(replay({ actions, endMs: 5000 })).toMatchObject({ moves: 8, elapsedMs: 7 });
  });

  it.each([
    { version: 2 }, { extra: true }, { boardCode: 'np1-4-01' },
    { endMs: -1 }, { endMs: 0.5 }, { endMs: Number.MAX_SAFE_INTEGER + 1 },
    { actions: [{ atMs: -1, index: 0 }] }, { actions: [{ atMs: 0.5, index: 0 }] },
    { actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 11 }] },
    { actions: [{ atMs: 801, index: 0 }] }, { actions: [{ atMs: 0, index: 16 }] },
    { actions: [{ atMs: 0, index: -1 }] }, { actions: [{ atMs: 0, index: 0.5 }] },
    { actions: [{ atMs: 0, index: 0, extra: true }] },
    { actions: [{ atMs: 0 }] }, { actions: null },
    { actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay data %j', patch => {
    expect(replay(patch)).toBeNull();
  });

  it('enforces JSON byte and action limits', () => {
    expect(replay({ actions: Array.from({ length: 10000 }, () => ({ atMs: 0, index: 0 })) })).not.toBeNull();
    const text = JSON.stringify(sample);
    expect(replayGame(text + ' '.repeat(1048576 - text.length))).not.toBeNull();
    expect(replayGame(text + ' '.repeat(1048577 - text.length))).toBeNull();
    for (const malformed of ['{', 'null', '[]', '{}']) expect(replayGame(malformed)).toBeNull();
  });
});
