import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, snapshotByteLimit } from './snapshot.ts';
import { activateCard, advanceGame } from './turn.ts';
import { createGame } from './state.ts';
import { parseJson } from './json.ts';

const base = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
function decode(change: Record<string, unknown>) { return decodeSnapshot(JSON.stringify({ ...base, ...change })); }

describe('snapshot validation', () => {
  it('round trips the literal snapshot without reconstructing a history', () => {
    const state = decode({});
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.selection).toEqual(base.selection);
    expect(state && JSON.parse(encodeSnapshot(state))).toEqual(base);
    expect(decode({ moves: 50, elapsedMs: 0 })).not.toBeNull();
  });
  it('exports integer elapsed and at least 1ms for fractional pending intervals', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Missing test board');
    const state = advanceGame(activateCard(activateCard(initial, 0), 1), 799.75);
    const restored = decodeSnapshot(encodeSnapshot(state));
    expect(restored?.elapsedMs).toBe(799);
    expect(restored?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  });
  it.each([
    { unknown: true }, { version: 2 }, { boardCode: ' np1-4-1' }, { matched: [0] },
    { matched: [0, 11, 0, 11] }, { matched: [0, 1] }, { matched: [16, 17] }, { matched: '0,11' },
    { moves: 1 }, { moves: 1000000 }, { moves: -1 }, { moves: 2.5 }, { moves: '2' },
    { elapsedMs: 360000000 }, { elapsedMs: -1 }, { elapsedMs: 0.5 }, { started: false }, { started: 1 },
    { selection: { kind: 'closed', extra: 1 } }, { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } }, { selection: { kind: 'one' } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 4, second: 5, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0.5 } },
    { selection: { kind: 'other' } }, { selection: null },
  ])('rejects inconsistent fields %j', change => { expect(decode(change)).toBeNull(); });
  it('validates started constraints and completed selections', () => {
    expect(decode({ matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false })).not.toBeNull();
    expect(decode({ matched: [], selection: { kind: 'closed' }, moves: 0 })).toBeNull();
    expect(decode({ matched: [], selection: { kind: 'one', index: 0 }, moves: 0 })).not.toBeNull();
    expect(decode({ matched: [], selection: { kind: 'one', index: 0 }, moves: 0, started: false })).toBeNull();
    expect(decode({ matched: Array.from({ length: 16 }, (_, i) => i), selection: { kind: 'closed' }, moves: 8 })).not.toBeNull();
  });
  it('enforces complete shape, JSON and byte limits', () => {
    for (const value of ['{', 'null', '[]', '{}', JSON.stringify({ ...base, started: undefined })]) {
      expect(decodeSnapshot(value)).toBeNull();
    }
    const text = JSON.stringify(base);
    expect(decodeSnapshot(text.padEnd(snapshotByteLimit, ' '))).not.toBeNull();
    expect(decodeSnapshot(text.padEnd(snapshotByteLimit + 1, ' '))).toBeNull();
    expect(parseJson(JSON.stringify('é'), 3)).toBeNull();
    expect(parseJson(JSON.stringify('é'), 4)).toBe('é');
  });
});
