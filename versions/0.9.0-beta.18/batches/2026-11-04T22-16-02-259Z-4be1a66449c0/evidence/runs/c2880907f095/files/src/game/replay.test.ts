import { describe, expect, it } from 'vitest';
import { SELECTION } from './constants';
import { replayGame } from './replay';
import { encodeSnapshot } from './snapshot';

describe('replays', () => {
  it('replays the documented example', () => {
    const state = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });

  it('resolves a mismatch exactly at the timestamp of the next action', () => {
    const state = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":1},{"atMs":800,"index":11}],"endMs":800}');
    expect(state?.selection).toEqual({ kind: SELECTION.ONE, index: 11 });
    expect(state?.moves).toBe(1);
    expect(state?.elapsedMs).toBe(800);
  });

  it('rejects unordered actions, unknown fields, and out-of-range positions', () => {
    expect(replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":2,"index":0},{"atMs":1,"index":1}],"endMs":2}')).toBeNull();
    expect(replayGame('{"version":1,"boardCode":"np1-4-1","actions":[],"endMs":0,"extra":1}')).toBeNull();
    expect(replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":16}],"endMs":0}')).toBeNull();
    const state = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[],"endMs":0}');
    expect(state ? encodeSnapshot(state) : null).toContain('"boardCode": "np1-4-1"');
  });
});
