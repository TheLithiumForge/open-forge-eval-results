import { describe, expect, it } from 'vitest';
import { createGame, activateCard } from './state.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const mismatchJson = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}';

describe('snapshot format', () => {
  it('loads the documented snapshot and preserves its version 1 JSON shape', () => {
    const state = decodeSnapshot(mismatchJson);
    expect(state?.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 300 });
    expect(state?.matched).toEqual([0, 11]);
    expect(state === null ? null : JSON.parse(encodeSnapshot(state))).toEqual(JSON.parse(mismatchJson));
  });

  it('round trips an initial and a live mismatch state', () => {
    const start = createGame('np1-4-1');
    if (start === null) throw new Error('Expected a valid board.');
    const mismatch = activateCard(activateCard(start, 0), 1);
    expect(decodeSnapshot(encodeSnapshot(start))?.started).toBe(false);
    expect(decodeSnapshot(encodeSnapshot(mismatch))).toEqual(mismatch);
  });

  it('rejects malformed, extra-key, out-of-range, and inconsistent state', () => {
    const selection = { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 };
    const valid = {
      version: 1, boardCode: 'np1-4-1', matched: [0, 11], selection,
      moves: 2, elapsedMs: 1500, started: true,
    };
    const bad = [
      '{', JSON.stringify({ ...valid, extra: true }), JSON.stringify({ ...valid, version: 2 }),
      JSON.stringify({ ...valid, moves: 0 }), JSON.stringify({ ...valid, matched: [0] }),
      JSON.stringify({ ...valid, matched: [0, 0] }),
      JSON.stringify({ ...valid, matched: [0, 11, 1, 2] }),
      JSON.stringify({ ...valid, selection: { ...selection, remainingMs: 0 } }),
      JSON.stringify({ ...valid, selection: { kind: 'closed', index: 1 } }),
      JSON.stringify({ ...valid, boardCode: 'np1-4-1\n' }),
    ];
    for (const text of bad) expect(decodeSnapshot(text)).toBeNull();
  });

  it('enforces UTF-8 byte size rather than character count', () => {
    expect(decodeSnapshot(' '.repeat(65_537))).toBeNull();
  });
});
