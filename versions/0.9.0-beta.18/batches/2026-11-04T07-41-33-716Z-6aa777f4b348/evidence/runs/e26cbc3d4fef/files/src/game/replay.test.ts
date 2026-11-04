import { describe, expect, it } from 'vitest';
import { MAX_ELAPSED_MS } from './game.ts';
import { MAX_REPLAY_ACTIONS, REPLAY_BYTE_LIMIT, replayGame } from './replay.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

function replay(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0, ...overrides });
}

describe('logical replay', () => {
  it('matches the documented example and serializes its final snapshot', () => {
    const state = replayGame(replay({ actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 }));
    expect(state).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, selection: { kind: 'closed' } });
    if (!state) throw new Error('Expected a valid replay.');
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
  });

  it('starts the clock at first reveal, respects equal-time order, and ignores blocked actions', () => {
    const actions = [
      { atMs: 100, index: 0 }, { atMs: 100, index: 0 }, { atMs: 100, index: 1 },
      { atMs: 200, index: 11 }, { atMs: 899, index: 2 },
      { atMs: 900, index: 0 }, { atMs: 900, index: 11 },
    ];
    expect(replayGame(replay({ actions, endMs: 1000 }))).toMatchObject({
      matched: [0, 11], moves: 2, elapsedMs: 900, selection: { kind: 'closed' },
    });
  });

  it('resolves a mismatch before an action at exactly its expiration', () => {
    const state = replayGame(replay({
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 }], endMs: 800,
    }));
    expect(state).toMatchObject({ moves: 1, elapsedMs: 800, selection: { kind: 'one', index: 2 } });
  });

  it('keeps the mismatch progressing when elapsed time is capped', () => {
    expect(replayGame(replay({ actions: [{ atMs: 0, index: 0 }], endMs: Number.MAX_SAFE_INTEGER })))
      .toMatchObject({ elapsedMs: MAX_ELAPSED_MS });
    const state = replayGame(replay({
      actions: [{ atMs: 0, index: 0 }, { atMs: MAX_ELAPSED_MS, index: 1 }],
      endMs: MAX_ELAPSED_MS + 800,
    }));
    expect(state).toMatchObject({ moves: 1, elapsedMs: MAX_ELAPSED_MS, selection: { kind: 'closed' } });
    expect(replayGame(replay({ endMs: Number.MAX_SAFE_INTEGER }))).toMatchObject({ elapsedMs: 0 });
  });
});

describe('replay validation', () => {
  it.each([
    { version: 2 }, { extra: true }, { boardCode: 'np1-4-0' }, { boardCode: 'np1-4-1 ' },
    { endMs: -1 }, { endMs: 1.1 }, { endMs: Number.MAX_SAFE_INTEGER + 1 }, { actions: null },
    { actions: [{ atMs: 0, index: -1 }] }, { actions: [{ atMs: 0, index: 16 }] },
    { actions: [{ atMs: 0, index: 0.5 }] }, { actions: [{ atMs: -1, index: 0 }] },
    { actions: [{ atMs: 0.5, index: 0 }] }, { actions: [{ atMs: 0, index: 0, extra: 0 }] },
    { actions: [{ atMs: 0 }] }, { actions: [{ index: 0 }] }, { actions: [null] },
    { actions: [{ atMs: 10, index: 0 }], endMs: 9 },
    { actions: [{ atMs: 10, index: 0 }, { atMs: 9, index: 1 }], endMs: 10 },
  ])('rejects invalid format %j', (overrides) => {
    expect(replayGame(replay(overrides))).toBeNull();
  });

  it('rejects malformed JSON and missing fields', () => {
    for (const text of ['', '{', 'null', '[]', '0']) expect(replayGame(text)).toBeNull();
    for (const key of ['version', 'boardCode', 'actions', 'endMs']) {
      const parsed: unknown = JSON.parse(replay());
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Expected fixture object.');
      expect(replayGame(JSON.stringify(Object.fromEntries(
        Object.entries(parsed).filter(([name]) => name !== key),
      )))).toBeNull();
    }
  });

  it('accepts at most 10000 actions and at most 1048576 UTF-8 bytes', () => {
    const actions = Array.from({ length: MAX_REPLAY_ACTIONS }, () => ({ atMs: 0, index: 0 }));
    expect(replayGame(replay({ actions }))).not.toBeNull();
    expect(replayGame(replay({ actions: [...actions, { atMs: 0, index: 0 }] }))).toBeNull();
    const text = replay();
    const boundary = text + ' '.repeat(REPLAY_BYTE_LIMIT - text.length);
    expect(replayGame(boundary)).not.toBeNull();
    expect(replayGame(boundary + ' ')).toBeNull();
  });
});
