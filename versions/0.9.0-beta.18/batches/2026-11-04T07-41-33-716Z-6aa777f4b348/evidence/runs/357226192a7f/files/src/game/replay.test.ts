import { expect, it } from 'vitest';
import { replayGame } from './replay.ts';

const base = { version: 1, boardCode: 'np1-4-1',
  actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const replay = (patch: Record<string, unknown> = {}) => replayGame(JSON.stringify({ ...base, ...patch }));

it('reproduces the documented example', () => {
  const state = replay();
  expect(state?.matched).toEqual([0, 11]);
  expect(state?.moves).toBe(1);
  expect(state?.elapsedMs).toBe(800);
});

it('resolves a mismatch exactly at an action timestamp, with stable equal-time ordering', () => {
  const state = replay({ actions: [{ atMs: 100, index: 0 }, { atMs: 100, index: 1 },
    { atMs: 899, index: 2 }, { atMs: 900, index: 2 }, { atMs: 900, index: 6 }], endMs: 900 });
  expect(state?.matched).toEqual([2, 6]);
  expect(state?.moves).toBe(2);
  expect(state?.elapsedMs).toBe(800);
  expect(state?.selection.kind).toBe('closed');
});

it('starts the clock at the first valid activation and caps only elapsed time', () => {
  expect(replay({ actions: [], endMs: 900 })?.elapsedMs).toBe(0);
  expect(replay({ actions: [{ atMs: 100, index: 0 }], endMs: 900 })?.elapsedMs).toBe(800);
  expect(replay({ endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(359999999);
});

it.each([
  { version: 2 }, { extra: 1 }, { boardCode: 'np1-4-0' }, { endMs: -1 },
  { endMs: 1.5 }, { endMs: Number.MAX_SAFE_INTEGER + 1 },
  { actions: [{ atMs: 1, index: 0 }], endMs: 0 },
  { actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }] },
  { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: -1 }] },
  { actions: [{ atMs: -1, index: 0 }] }, { actions: [{ atMs: 0.1, index: 0 }] },
  { actions: [{ atMs: 0, index: 0, extra: true }] },
  { actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) },
])('rejects invalid replay %j', patch => expect(replay(patch)).toBeNull());

it('rejects malformed, missing and oversized data', () => {
  for (const text of ['null', '{}', '{', ' '.repeat(1048577)]) expect(replayGame(text)).toBeNull();
  for (const key of Object.keys(base)) {
    const copy: Record<string, unknown> = { ...base };
    delete copy[key];
    expect(replayGame(JSON.stringify(copy))).toBeNull();
  }
});
