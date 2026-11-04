import { describe, expect, it } from 'vitest';
import { replayGame, REPLAY_BYTE_LIMIT } from './replay.ts';

const example = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const run = (value: unknown) => replayGame(JSON.stringify(value));
describe('version 1 replay', () => {
  it('reproduces the example', () => {
    expect(run(example)).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, selection: { kind: 'closed' } });
  });
  it('starts the clock on the first valid activation', () => {
    expect(run({ ...example, actions: [{ atMs: 1000, index: 0 }], endMs: 1500 })?.elapsedMs).toBe(500);
    expect(run({ ...example, actions: [], endMs: 5000 })?.elapsedMs).toBe(0);
  });
  it('resolves an equal-time timeout before the next action', () => {
    const actions = [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 799, index: 2 },
      { atMs: 800, index: 0 }, { atMs: 800, index: 11 }];
    expect(run({ ...example, actions })).toMatchObject({ matched: [0, 11], moves: 2, selection: { kind: 'closed' } });
  });
  it('keeps equal-time action order and caps elapsed with safe-integer timestamps', () => {
    expect(run({ ...example, actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 0, index: 11 }] }))
      .toMatchObject({ moves: 1, matched: [], selection: { kind: 'closed' } });
    expect(run({ ...example, endMs: Number.MAX_SAFE_INTEGER })?.elapsedMs).toBe(359999999);
  });
  it.each([null, [], { ...example, version: 2 }, { ...example, extra: 0 }, { ...example, actions: {} },
    { ...example, endMs: 0.5 }, { ...example, endMs: -1 }, { ...example, endMs: Number.MAX_SAFE_INTEGER + 1 },
    { ...example, boardCode: 'np1-4-0' },
    ...[{ atMs: 0, index: 16 }, { atMs: -1, index: 0 }, { atMs: 0, index: 0, x: 1 },
      { atMs: 0.5, index: 0 }, { index: 0 }, { atMs: 0, index: 0.5 }].map(action => ({ ...example, actions: [action] })),
    { ...example, actions: [{ atMs: 1, index: 0 }, { atMs: 0, index: 1 }] },
    { ...example, actions: [{ atMs: 801, index: 0 }] },
    { ...example, actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) },
  ].map((value, index) => ({ value, index })))('rejects invalid replay $index', ({ value }) => {
    expect(run(value)).toBeNull();
  });
  it('limits bytes and rejects malformed JSON', () => {
    expect(replayGame('x')).toBeNull();
    expect(replayGame(' '.repeat(REPLAY_BYTE_LIMIT) + JSON.stringify(example))).toBeNull();
  });
});
