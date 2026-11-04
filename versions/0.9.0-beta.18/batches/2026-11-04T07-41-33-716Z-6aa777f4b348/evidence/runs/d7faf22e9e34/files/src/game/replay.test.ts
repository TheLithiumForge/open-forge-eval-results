import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_ACTION_LIMIT, REPLAY_BYTE_LIMIT } from './replay.ts';
import { encodeSnapshot } from './snapshot.ts';

const BASE = { version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const replay = (changes: Record<string, unknown> = {}): string => JSON.stringify({ ...BASE, ...changes });

describe('version 1 replay', () => {
  it('replays the published example', () => {
    const state = replayGame(replay());
    expect(state).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800,
      started: true, selection: { kind: 'closed' } });
    if (!state) throw new Error('Example must parse');
    expect(JSON.parse(encodeSnapshot(state))).toEqual({ version: 1, boardCode: 'np1-4-1',
      matched: [0, 11], moves: 1, elapsedMs: 800, started: true, selection: { kind: 'closed' } });
  });

  it('resolves a mismatch before an equal-time action and keeps equal-time array order', () => {
    const state = replayGame(replay({ actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 },
      { atMs: 799, index: 2 }, { atMs: 800, index: 2 }, { atMs: 800, index: 6 }], endMs: 800 }));
    expect(state).toMatchObject({ matched: [2, 6], moves: 2, elapsedMs: 800,
      selection: { kind: 'closed' } });
  });

  it('starts the clock at the first reveal, not the replay origin', () => {
    expect(replayGame(replay({ actions: [{ atMs: 3000, index: 0 }], endMs: 3500 })))
      .toMatchObject({ elapsedMs: 500, moves: 0 });
    expect(replayGame(replay({ actions: [], endMs: 10000 })))
      .toMatchObject({ elapsedMs: 0, started: false });
  });

  it('applies ignored activations and leaves unfinished mismatches pending', () => {
    const state = replayGame(replay({ actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 0 },
      { atMs: 100, index: 1 }, { atMs: 200, index: 2 }], endMs: 400 }));
    expect(state).toMatchObject({ moves: 1, elapsedMs: 400,
      selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 500 } });
  });

  it('caps the elapsed clock while accepting safe-integer replay timeline times', () => {
    expect(replayGame(replay({ endMs: Number.MAX_SAFE_INTEGER })))
      .toMatchObject({ elapsedMs: 359999999 });
    expect(replayGame(replay({ actions: [{ atMs: Number.MAX_SAFE_INTEGER - 1, index: 0 }],
      endMs: Number.MAX_SAFE_INTEGER })))
      .toMatchObject({ elapsedMs: 1 });
  });

  it('stops time at victory even if later actions or end time occur', () => {
    const pairs = [[2, 6], [10, 14], [4, 5], [8, 15], [12, 13], [3, 7], [0, 11], [1, 9]];
    const actions = pairs.flatMap((pair, index) => pair.map((position) => ({ atMs: index * 100, index: position })));
    expect(replayGame(replay({ actions: [...actions, { atMs: 10000, index: 0 }], endMs: 20000 })))
      .toMatchObject({ moves: 8, elapsedMs: 700, matched: pairs.flat() });
  });

  it.each([
    { version: 2 }, { extra: true }, { boardCode: 'np1-4-1\n' }, { actions: null },
    { actions: [{ atMs: 0, index: 0, extra: true }] },
    { actions: [{ atMs: -1, index: 0 }] }, { actions: [{ atMs: 0.5, index: 0 }] },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: -1 }] },
    { actions: [{ atMs: 0, index: 1.5 }] }, { actions: [{ index: 0 }] },
    { actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }] },
    { actions: [{ atMs: 801, index: 0 }] }, { endMs: -1 }, { endMs: 1.5 },
    { endMs: Number.MAX_SAFE_INTEGER + 1 }, { endMs: null },
  ])('rejects invalid replay %j', (changes) => expect(replayGame(replay(changes))).toBeNull());

  it('enforces complete JSON shape, byte and action limits', () => {
    for (const text of ['null', '{}', '[]', '{', '']) expect(replayGame(text)).toBeNull();
    const maxActions = Array.from({ length: REPLAY_ACTION_LIMIT }, () => ({ atMs: 0, index: 0 }));
    expect(replayGame(replay({ actions: maxActions }))).not.toBeNull();
    expect(replayGame(replay({ actions: [...maxActions, { atMs: 0, index: 0 }] }))).toBeNull();
    expect(replayGame(replay().padEnd(REPLAY_BYTE_LIMIT, ' '))).not.toBeNull();
    expect(replayGame(replay().padEnd(REPLAY_BYTE_LIMIT + 1, ' '))).toBeNull();
  });
});
