import { expect, test } from 'vitest';
import { replayGame, REPLAY_ACTIONS, REPLAY_BYTES } from './replay.ts';
import { MAX_ELAPSED } from './state.ts';

const base = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
test('published replay preserves equal-time array order', () => {
  const state = replayGame(JSON.stringify(base));
  expect(state?.matched).toEqual([0, 11]);
  expect(state?.moves).toBe(1);
  expect(state?.elapsedMs).toBe(800);
});
test('resolves an exact mismatch boundary before the next action', () => {
  const state = replayGame(JSON.stringify({ ...base, actions: [
    { atMs: 100, index: 0 }, { atMs: 100, index: 1 }, { atMs: 899, index: 2 },
    { atMs: 900, index: 0 }, { atMs: 900, index: 11 },
  ], endMs: 1000 }));
  expect(state?.moves).toBe(2);
  expect(state?.matched).toEqual([0, 11]);
  expect(state?.selection.kind).toBe('closed');
  expect(state?.elapsedMs).toBe(900);
});
test('wait before first activation is omitted; long timelines cap elapsed time', () => {
  expect(replayGame(JSON.stringify({ ...base, actions: [], endMs: 1000 }))?.elapsedMs).toBe(0);
  expect(replayGame(JSON.stringify({ ...base, actions: [{ atMs: 1000, index: 0 }], endMs: 2000 }))?.elapsedMs).toBe(1000);
  expect(replayGame(JSON.stringify({ ...base, endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs).toBe(MAX_ELAPSED);
});
test.each([
  { extra: true }, { version: 2 }, { boardCode: 'np2-4-1' }, { actions: null }, { endMs: -1 }, { endMs: 1.5 },
  { endMs: Number.MAX_SAFE_INTEGER + 1 }, { actions: [{ atMs: 10, index: 0 }], endMs: 9 },
  { actions: [{ atMs: 10, index: 0 }, { atMs: 9, index: 1 }] },
  { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: 0, extra: true }] },
  { actions: [{ atMs: 0.5, index: 0 }] }, { actions: [{ atMs: 0, index: 0.5 }] },
  { actions: Array.from({ length: REPLAY_ACTIONS + 1 }, () => ({ atMs: 0, index: 0 })) },
])('rejects invalid replay %j', change => expect(replayGame(JSON.stringify({ ...base, ...change }))).toBeNull());
test('rejects malformed and byte-limit input', () => {
  for (const text of ['', 'null', '{', '[]', ' '.repeat(REPLAY_BYTES) + JSON.stringify(base)]) expect(replayGame(text)).toBeNull();
});
