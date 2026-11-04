import { describe, expect, it } from 'vitest';
import { createGame } from './state.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTES } from './snapshot.ts';

const example = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};
const decode = (changes: Record<string, unknown>) => decodeSnapshot(JSON.stringify({ ...example, ...changes }));

describe('snapshot version 1', () => {
  it('round trips the example and a fresh state without storing derived data', () => {
    const restored = decode({});
    expect(restored?.selection).toEqual(example.selection);
    if (!restored) throw new Error('Missing snapshot');
    expect(JSON.parse(encodeSnapshot(restored))).toEqual(example);
    expect(decodeSnapshot(encodeSnapshot(restored))).toEqual(restored);
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Missing board');
    expect(decodeSnapshot(encodeSnapshot(initial))).toEqual(initial);
  });
  it.each([
    { extra: 1 }, { version: 2 }, { boardCode: ' np1-4-1' }, { moves: 1 }, { moves: 1000000 },
    { moves: -1 }, { moves: 1.5 }, { elapsedMs: 360000000 }, { elapsedMs: -1 }, { elapsedMs: 1.2 },
    { started: false }, { started: 'true' }, { matched: [0] }, { matched: [0, 11, 0, 11] },
    { matched: [0, 1] }, { matched: [16, 17] }, { matched: [0.5, 11] },
    { selection: { kind: 'closed', extra: 1 } }, { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } }, { selection: { kind: 'other' } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300, extra: true } },
  ])('rejects inconsistent or unknown data: %j', changes => expect(decode(changes)).toBeNull());
  it('enforces started and minimum-turn invariants without inventing history checks', () => {
    const empty = { matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0 };
    expect(decode({ ...empty, started: true })).toBeNull();
    expect(decode({ ...empty, started: false })).not.toBeNull();
    expect(decode({ ...empty, started: false, elapsedMs: 1 })).toBeNull();
    expect(decode({ ...empty, started: true, selection: { kind: 'one', index: 0 } })).not.toBeNull();
    expect(decode({ ...empty, started: true, moves: 1, elapsedMs: 0 })).not.toBeNull();
  });
  it('accepts completed and capped progress', () => {
    expect(decode({ matched: Array.from({ length: 16 }, (_, index) => index), selection: { kind: 'closed' }, moves: 8 })).not.toBeNull();
    expect(decode({ moves: 999999, elapsedMs: 359999999 })).not.toBeNull();
  });
  it('checks exact fields, malformed JSON and the UTF-8 byte limit', () => {
    expect(decodeSnapshot('{}')).toBeNull();
    expect(decodeSnapshot('[]')).toBeNull();
    expect(decodeSnapshot('{')).toBeNull();
    const text = JSON.stringify(example);
    expect(decodeSnapshot(text + ' '.repeat(SNAPSHOT_BYTES - text.length))).not.toBeNull();
    expect(decodeSnapshot(text + ' '.repeat(SNAPSHOT_BYTES - text.length + 1))).toBeNull();
    expect(decodeSnapshot(text + '\u2000'.repeat(22000))).toBeNull();
  });
});
