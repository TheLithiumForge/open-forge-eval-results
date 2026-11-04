import { expect, it } from 'vitest';
import { replayGame } from './replay.ts';
import { MAX_ELAPSED_MS } from './state.ts';

const example = { version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800 };
const replay = (value: unknown) => replayGame(JSON.stringify(value));
it('replays the literal example', () => {
  expect(replay(example)).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, selection: { kind: 'closed' } });
});
it('resolves equal-time deadlines before activation and preserves array order', () => {
  const actions = [{ atMs: 100, index: 0 }, { atMs: 100, index: 1 },
    { atMs: 899, index: 2 }, { atMs: 900, index: 0 }, { atMs: 900, index: 11 }];
  expect(replay({ ...example, actions, endMs: 900 })).toMatchObject({ matched: [0, 11], moves: 2, elapsedMs: 800 });
});
it('starts time at the first reveal and caps elapsed independently of mismatch timing', () => {
  expect(replay({ ...example, actions: [], endMs: 900000 })).toMatchObject({ elapsedMs: 0, started: false });
  const actions = [{ atMs: 5000, index: 0 }, { atMs: 5000, index: 1 }];
  expect(replay({ ...example, actions, endMs: Number.MAX_SAFE_INTEGER }))
    .toMatchObject({ elapsedMs: MAX_ELAPSED_MS, selection: { kind: 'closed' } });
});
it.each([
  { ...example, version: 2 }, { ...example, extra: 1 }, { ...example, endMs: -1 },
  { ...example, endMs: 0.5 }, { ...example, actions: [{ atMs: 100, index: 0 }, { atMs: 99, index: 11 }] },
  { ...example, actions: [{ atMs: 0, index: 16 }] }, { ...example, actions: [{ atMs: 0, index: 0, extra: 1 }] },
  { ...example, endMs: 0, actions: [{ atMs: 1, index: 0 }] },
  { ...example, actions: Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 })) },
  { ...example, actions: [null] }, { ...example, actions: false }, null,
])('rejects invalid replays %#', value => expect(replay(value)).toBeNull());
it('enforces the byte limit and malformed JSON', () => {
  expect(replayGame('{')).toBeNull();
  const text = JSON.stringify(example);
  expect(replayGame(text + ' '.repeat(1048576 - text.length))).not.toBeNull();
  expect(replayGame(text + ' '.repeat(1048577 - text.length))).toBeNull();
});
