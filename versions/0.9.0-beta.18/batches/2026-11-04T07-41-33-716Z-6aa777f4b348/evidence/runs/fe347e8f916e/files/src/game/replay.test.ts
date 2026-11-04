import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_LIMIT } from './replay.ts';
import { MAX_ELAPSED_MS } from './model.ts';

const base = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const replay = (changes: Record<string, unknown>) => replayGame(JSON.stringify({ ...base, ...changes }));

describe('logical replay', () => {
  it('matches the documented example', () => {
    expect(replay({})).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, selection: { kind: 'closed' } });
  });
  it('resolves a timeout before an equal-time action while ignoring earlier activations', () => {
    const state = replay({ actions: [{ atMs: 100, index: 0 }, { atMs: 100, index: 1 },
      { atMs: 899, index: 2 }, { atMs: 900, index: 2 }, { atMs: 900, index: 6 }], endMs: 1000 });
    expect(state).toMatchObject({ matched: [2, 6], moves: 2, elapsedMs: 900, selection: { kind: 'closed' } });
  });
  it('ignores repeated and matched activation and starts time at the first reveal', () => {
    expect(replay({ actions: [{ atMs: 500, index: 0 }, { atMs: 600, index: 0 },
      { atMs: 700, index: 11 }, { atMs: 800, index: 11 }], endMs: 1000 }))
      .toMatchObject({ moves: 1, elapsedMs: 500 });
    expect(replay({ actions: [], endMs: Number.MAX_SAFE_INTEGER }))
      .toMatchObject({ started: false, elapsedMs: 0 });
  });
  it('accepts safe timeline times larger than the elapsed cap', () => {
    expect(replay({ endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(MAX_ELAPSED_MS);
  });
  it.each([{ version: 2 }, { extra: 0 }, { boardCode: 'bad' }, { actions: null },
    { endMs: -1 }, { endMs: 0.5 }, { endMs: Number.MAX_SAFE_INTEGER + 1 },
    { actions: [{ atMs: -1, index: 0 }] }, { actions: [{ atMs: 0, index: 16 }] },
    { actions: [{ atMs: 0, index: 0, extra: true }] }, { actions: [{ index: 0 }] },
    { actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 11 }] },
    { actions: [{ atMs: 1000, index: 0 }] },
    { actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay %j', (changes) => expect(replay(changes)).toBeNull());
  it('enforces the byte limit and accepts the action-count boundary', () => {
    expect(replay({ actions: Array.from({ length: 10000 }, () => ({ atMs: 0, index: 0 })) })).not.toBeNull();
    const text = JSON.stringify(base);
    expect(replayGame(text.padEnd(REPLAY_LIMIT, ' '))).not.toBeNull();
    expect(replayGame(text.padEnd(REPLAY_LIMIT + 1, ' '))).toBeNull();
    for (const text of ['', '{', 'null', '[]']) expect(replayGame(text)).toBeNull();
  });
});
