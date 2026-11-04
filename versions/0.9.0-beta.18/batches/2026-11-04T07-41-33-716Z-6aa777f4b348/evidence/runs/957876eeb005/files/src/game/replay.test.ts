import { describe, expect, it } from 'vitest';
import { replayGame } from './replay.ts';
import { REPLAY_ACTION_LIMIT, REPLAY_BYTE_LIMIT } from './replay-input.ts';

const replay = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };

it('runs the documented replay and preserves equal-time action ordering', () => {
  const state = replayGame(JSON.stringify(replay));
  expect(state?.matched).toEqual([0, 11]);
  expect(state?.moves).toBe(1);
  expect(state?.elapsedMs).toBe(800);
});

it('resolves an interval before an action at exactly its deadline', () => {
  const state = replayGame(JSON.stringify({ ...replay, actions: [
    { atMs: 0, index: 0 }, { atMs: 0, index: 1 },
    { atMs: 799, index: 11 }, { atMs: 800, index: 0 }, { atMs: 800, index: 11 },
  ] }));
  expect(state?.moves).toBe(2);
  expect(state?.matched).toEqual([0, 11]);
  expect(state?.selection.kind).toBe('closed');
});

it('starts elapsed time at the first activation, caps it, and accepts max-safe logical timestamps', () => {
  expect(replayGame(JSON.stringify({ ...replay, actions: [{ atMs: 500, index: 0 }], endMs: 1500 }))?.elapsedMs).toBe(1000);
  expect(replayGame(JSON.stringify({ ...replay, endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs).toBe(359999999);
  expect(replayGame(JSON.stringify({ ...replay, actions: [{ atMs: Number.MAX_SAFE_INTEGER, index: 0 }],
    endMs: Number.MAX_SAFE_INTEGER }))?.elapsedMs).toBe(0);
  expect(replayGame(JSON.stringify({ ...replay, actions: [], endMs: Number.MAX_SAFE_INTEGER }))?.started).toBe(false);
});

const invalid: unknown[] = [
  null, [], {}, { ...replay, extra: 1 }, { ...replay, version: 2 },
  { ...replay, boardCode: 'np1-4-0' }, { ...replay, endMs: -1 }, { ...replay, endMs: 1.5 },
  { ...replay, endMs: Number.MAX_SAFE_INTEGER + 1 }, { ...replay, actions: {} },
  { ...replay, actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }] },
  { ...replay, actions: [{ atMs: 801, index: 0 }] },
  { ...replay, actions: [{ atMs: 0, index: 16 }] },
  { ...replay, actions: [{ atMs: 0, index: -1 }] },
  { ...replay, actions: [{ atMs: 0, index: 1.5 }] },
  { ...replay, actions: [{ atMs: 0, index: 1, extra: 0 }] },
  { ...replay, actions: [{ atMs: 0 }] }, { ...replay, actions: [null] },
  { ...replay, actions: [{ atMs: -1, index: 0 }] },
  { ...replay, actions: [{ atMs: 0.5, index: 0 }] },
  { ...replay, actions: [{ atMs: Number.MAX_SAFE_INTEGER + 1, index: 0 }] },
  { ...replay, actions: Array.from({ length: REPLAY_ACTION_LIMIT + 1 }, () => ({ atMs: 0, index: 0 })) },
];

describe('strict replay validation', () => {
  for (const [index, value] of invalid.entries()) {
    it(`rejects inconsistent or unknown data ${index}`, () => expect(replayGame(JSON.stringify(value))).toBeNull());
  }
  it('rejects malformed and oversized input', () => {
    expect(replayGame('{')).toBeNull();
    expect(replayGame(` ${' '.repeat(REPLAY_BYTE_LIMIT)}${JSON.stringify(replay)}`)).toBeNull();
  });
});
