import { expect, it } from 'vitest';
import { replayGame } from './replay.ts';
import { MAX_ELAPSED_MS } from './state.ts';

const base = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const replay = (value: unknown) => replayGame(JSON.stringify(value));

it('matches the literal reference replay', () => {
  const result = replay(base);
  expect(result?.matched).toEqual([0, 11]);
  expect(result?.moves).toBe(1);
  expect(result?.elapsedMs).toBe(800);
});

it('resolves exact-time mismatches before same-time actions in array order', () => {
  const actions = [{ atMs: 100, index: 0 }, { atMs: 100, index: 1 },
    { atMs: 899, index: 2 }, { atMs: 900, index: 0 }, { atMs: 900, index: 11 }];
  const result = replay({ ...base, actions, endMs: 1000 });
  expect(result?.matched).toEqual([0, 11]);
  expect(result?.moves).toBe(2);
  expect(result?.elapsedMs).toBe(900);
});

it('starts clock on the first activation and caps huge replay timelines', () => {
  expect(replay({ ...base, actions: [], endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(0);
  expect(replay({ ...base, endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(MAX_ELAPSED_MS);
  expect(replay({ ...base, actions: [{ atMs: 1000, index: 0 }], endMs: 1500 })?.elapsedMs).toBe(500);
});

it.each([
  { extra: 1 }, { version: 2 }, { boardCode: 'np1-4-0' }, { endMs: -1 }, { endMs: 1.5 },
  { endMs: Number.MAX_SAFE_INTEGER + 1 }, { actions: [{ atMs: 1000, index: 0 }] },
  { actions: [{ atMs: 0, index: 16 }] }, { actions: [{ atMs: 0, index: 1, extra: true }] },
  { actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 11 }] },
])('rejects invalid replay %j', override => { expect(replay({ ...base, ...override })).toBeNull(); });

it('rejects malformed and byte-oversized replays', () => {
  expect(replayGame('{')).toBeNull();
  expect(replayGame(JSON.stringify(base) + ' '.repeat(1048576))).toBeNull();
  expect(replay({ ...base, actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) })).toBeNull();
});
