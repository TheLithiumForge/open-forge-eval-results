import { describe, expect, it } from 'vitest';
import { replayGame } from './replay.ts';
import { encodeSnapshot } from './snapshot.ts';

describe('replays', () => {
  it('resolves the version 1 example with logical elapsed time', () => {
    const state = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
    expect(state && JSON.parse(encodeSnapshot(state))).toMatchObject({ matched: [0, 11], moves: 1, elapsedMs: 800, started: true });
    expect(state?.selection).toEqual({ kind: 'closed' });
  });

  it('closes a mismatch before an action at its exact deadline', () => {
    const input = JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 2 }], endMs: 800 });
    expect(replayGame(input)?.selection).toEqual({ kind: 'one', index: 2 });
  });

  it.each([
    '{"version":1,"boardCode":"np1-4-1","actions":[],"endMs":0,"extra":1}',
    '{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":2,"index":0},{"atMs":1,"index":1}],"endMs":2}',
    '{"version":2,"boardCode":"np1-4-1","actions":[],"endMs":0}',
  ])('rejects malformed replay %s', (input) => expect(replayGame(input)).toBeNull());
});
