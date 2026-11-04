import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';
import { testGame } from './state.test-support.ts';
import { activateCard, advanceGame } from './transitions.ts';

describe('snapshot round trips', () => {
  it('round trips a fresh deal and an active one-card state', () => {
    const initial = testGame();
    expect(decodeSnapshot(encodeSnapshot(initial))).toEqual(initial);
    const state = advanceGame(activateCard(initial, 0), 1234);
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
  });

  it('loads the documented pending mismatch example', () => {
    const example = '{"version":1,"boardCode":"np1-4-1","matched":[0,11],'
      + '"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},'
      + '"moves":2,"elapsedMs":1500,"started":true}';
    const state = decodeSnapshot(example);
    expect(state).toMatchObject({
      matched: [0, 11], moves: 2, elapsedMs: 1500, started: true,
      selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    });
    if (!state) throw new Error('Example must be valid.');
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    expect(advanceGame(state, 300).selection.kind).toBe('closed');
  });

  it('exports readable, integer-only timing without mutating fractional state', () => {
    const state = advanceGame(activateCard(activateCard(testGame(), 0), 1), 799.75);
    const exported = encodeSnapshot(state);
    expect(exported).toContain('\n  "version": 1');
    expect(decodeSnapshot(exported)).toMatchObject({ elapsedMs: 799, selection: { remainingMs: 1 } });
    expect(state.elapsedMs).toBe(799.75);
    expect(state.selection).toMatchObject({ remainingMs: 0.25 });
  });

  it('permits stated consistency without reconstructing previous turns', () => {
    const state = { ...testGame(), moves: 10, elapsedMs: 0, started: true };
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
  });

  it('accepts exactly the snapshot UTF-8 byte boundary', () => {
    const json = encodeSnapshot(testGame());
    expect(decodeSnapshot(json + ' '.repeat(SNAPSHOT_BYTE_LIMIT - new TextEncoder().encode(json).length)))
      .not.toBeNull();
    expect(decodeSnapshot(json + ' '.repeat(SNAPSHOT_BYTE_LIMIT))).toBeNull();
    expect(decodeSnapshot('é'.repeat(SNAPSHOT_BYTE_LIMIT / 2 + 1))).toBeNull();
  });
});
