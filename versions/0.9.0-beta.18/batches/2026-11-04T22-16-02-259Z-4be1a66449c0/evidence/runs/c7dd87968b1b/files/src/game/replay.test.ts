import { describe, expect, it } from 'vitest';
import { replayGame } from './replay.ts';
import { pairCount } from './transitions.ts';

describe('version 1 replay', () => {
  it('replays the documented example on its logical timeline', () => {
    const result = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":11}],"endMs":800}');
    expect(result?.moves).toBe(1);
    expect(result ? pairCount(result) : undefined).toBe(1);
    expect(result?.elapsedMs).toBe(800);
  });

  it('resolves a timeout before an equal-time action', () => {
    const result = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":0,"index":0},{"atMs":0,"index":1},{"atMs":800,"index":0}],"endMs":800}');
    expect(result?.selection).toEqual({ kind: 'one', index: 0 });
    expect(result?.elapsedMs).toBe(800);
  });

  it('rejects malformed, out-of-order and oversized replays', () => {
    expect(replayGame('{"version":1,"boardCode":"np1-4-1","actions":[],"endMs":0,"extra":1}')).toBeNull();
    expect(replayGame('{"version":1,"boardCode":"np1-4-1","actions":[{"atMs":2,"index":0},{"atMs":1,"index":1}],"endMs":2}')).toBeNull();
    expect(replayGame(' '.repeat(1_048_577))).toBeNull();
  });
});
