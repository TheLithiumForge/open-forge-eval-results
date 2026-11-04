import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_BYTE_LIMIT } from './replay.ts';

const example = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };

describe('logical replay', () => {
  it('matches the documented replay', () => {
    const game = replayGame(JSON.stringify(example));
    expect(game?.matched).toEqual([0, 11]);
    expect(game?.moves).toBe(1);
    expect(game?.elapsedMs).toBe(800);
  });
  it('resolves equal-time deadlines before activation and preserves array order', () => {
    const game = replayGame(JSON.stringify({ ...example, actions: [
      { atMs: 100, index: 0 }, { atMs: 100, index: 1 },
      { atMs: 899, index: 2 }, { atMs: 900, index: 2 }, { atMs: 900, index: 6 },
    ], endMs: 900 }));
    expect(game?.matched).toEqual([2, 6]);
    expect(game?.moves).toBe(2);
    expect(game?.elapsedMs).toBe(800);
  });
  it('starts elapsed time on the first reveal and caps large safe times', () => {
    expect(replayGame(JSON.stringify({ ...example, actions: [], endMs: 800 }))?.elapsedMs).toBe(0);
    const game = replayGame(JSON.stringify({ ...example, actions: [{ atMs: 500, index: 0 }], endMs: Number.MAX_SAFE_INTEGER }));
    expect(game?.elapsedMs).toBe(359999999);
  });
  it.each([
    { version: 2 }, { extra: 0 }, { boardCode: 'np1-04-1' }, { endMs: 0.5 }, { endMs: -1 },
    { endMs: Number.MAX_SAFE_INTEGER + 1 }, { actions: [{ atMs: 801, index: 0 }] },
    { actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }] },
    { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: 0, extra: 1 }] },
    { actions: [{ atMs: 0 }] }, { actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) },
  ])('rejects invalid replay %j', fields => {
    expect(replayGame(JSON.stringify({ ...example, ...fields }))).toBeNull();
  });
  it('rejects malformed, oversized and multibyte oversized input', () => {
    for (const text of ['{', '[]', JSON.stringify(example) + ' '.repeat(REPLAY_BYTE_LIMIT),
      JSON.stringify(example) + '　'.repeat(350000)]) expect(replayGame(text)).toBeNull();
  });
});
