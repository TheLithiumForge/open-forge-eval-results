import { describe, expect, it } from 'vitest';
import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';
import { createGame } from './state.ts';

const blank = {
  version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' },
  moves: 0, elapsedMs: 0, started: false,
};
const sample = {
  ...blank, matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};
const decode = (value: unknown) => decodeSnapshot(JSON.stringify(value));

describe('snapshot format', () => {
  it('round trips every selection and whole milliseconds', () => {
    const state = createGame('np1-4-1');
    if (!state) throw new Error('Invalid fixture');
    const one = activateCard(state, 0);
    const miss = advanceGame(activateCard(one, 1), 799.5);
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    expect(decodeSnapshot(encodeSnapshot(one))).toEqual(one);
    const restored = decodeSnapshot(encodeSnapshot(miss));
    expect(restored?.elapsedMs).toBe(799);
    expect(restored?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(decode(sample)?.matched).toEqual([0, 11]);
  });
  it.each([
    { ...blank, extra: true }, { ...blank, version: 2 }, { ...blank, boardCode: ' np1-4-1' },
    { ...sample, matched: [0] }, { ...sample, matched: [0, 0] }, { ...sample, matched: [0, 1] },
    { ...sample, matched: [0, 11, 16, 17] }, { ...sample, matched: [-1, 11] },
    { ...sample, selection: { kind: 'one', index: 0 } },
    { ...sample, selection: { kind: 'one', index: 16 } },
    { ...sample, selection: { kind: 'closed', extra: 0 } },
    { ...sample, selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 1 } },
    { ...sample, selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 1 } },
    ...[0, 801, 1.5].map((remainingMs) => ({ ...sample, selection: { ...sample.selection, remainingMs } })),
    ...[-1, 1000000, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity].map((moves) => ({ ...sample, moves })),
    ...[-1, 360000000, 0.5, NaN].map((elapsedMs) => ({ ...sample, elapsedMs })),
    { ...sample, moves: 1 }, { ...blank, started: true }, { ...blank, started: 1 },
    { ...blank, moves: 1 }, { ...blank, elapsedMs: 1 },
    { ...blank, selection: { kind: 'one', index: 2 } },
    { ...sample, started: false }, [], null,
  ])('rejects inconsistent or unknown fields %#', (value) => expect(decode(value)).toBeNull());
  it('validates stated constraints without demanding a play history', () => {
    expect(decode({ ...blank, started: true, moves: 1, elapsedMs: 0 })).not.toBeNull();
    expect(decode({ ...blank, started: true, selection: { kind: 'one', index: 0 } })).not.toBeNull();
    const complete = { ...blank, matched: Array.from({ length: 16 }, (_, i) => i), moves: 8, started: true };
    expect(decode(complete)).not.toBeNull();
    expect(decode({ ...complete, selection: { kind: 'one', index: 0 } })).toBeNull();
  });
  it('rejects malformed input and applies UTF-8 bytes rather than character count', () => {
    expect(decodeSnapshot('{')).toBeNull();
    const json = JSON.stringify(blank);
    expect(decodeSnapshot(json + ' '.repeat(SNAPSHOT_BYTE_LIMIT - json.length))).not.toBeNull();
    expect(decodeSnapshot(json + ' '.repeat(SNAPSHOT_BYTE_LIMIT))).toBeNull();
    expect(decodeSnapshot('é'.repeat(SNAPSHOT_BYTE_LIMIT / 2 + 1))).toBeNull();
  });
});
