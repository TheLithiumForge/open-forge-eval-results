import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTES } from './snapshot.ts';
import { activateCard, advanceGame, createGame } from './transitions.ts';

const valid = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};
const decode = (overrides: Record<string, unknown>) => decodeSnapshot(JSON.stringify({ ...valid, ...overrides }));

describe('snapshot contract', () => {
  it('round trips the specification example and advances only on request', () => {
    const state = decode({});
    expect(state).not.toBeNull();
    if (!state) return;
    expect(JSON.parse(encodeSnapshot(state))).toEqual(valid);
    expect(advanceGame(state, 299).selection.kind).toBe('mismatch');
    expect(advanceGame(state, 300).selection.kind).toBe('closed');
  });
  it('round trips a fresh game, a first reveal and a match', () => {
    const start = createGame('np1-4-1');
    if (!start) throw new Error('Bad test board');
    for (const game of [start, activateCard(start, 0), activateCard(activateCard(start, 0), 11)]) {
      expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
    }
  });
  it('exports fractional timers as valid whole milliseconds', () => {
    const game = decode({});
    if (!game) throw new Error('Bad fixture');
    const text = encodeSnapshot(advanceGame(game, 299.9));
    expect(decodeSnapshot(text)).toMatchObject({ elapsedMs: 1799, selection: { remainingMs: 1 } });
  });
  it.each([
    { extra: true }, { version: 2 }, { boardCode: ' np1-4-1' }, { matched: [0, 0] },
    { matched: [0] }, { matched: [0, 1] }, { matched: [-1, 11] }, { matched: [0, 16] },
    { matched: ['0', 11] }, { moves: 1 }, { moves: 1000000 }, { moves: -1 }, { moves: 2.5 },
    { elapsedMs: -1 }, { elapsedMs: 360000000 }, { elapsedMs: 0.5 }, { started: false }, { started: 1 },
    { selection: { kind: 'closed', extra: 1 } }, { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } }, { selection: { kind: 'one' } }, { selection: null },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 2, second: 6, remainingMs: 300 } },
    ...[0, 801, 0.5, '300'].map(remainingMs => ({ selection: { ...valid.selection, remainingMs } })),
  ])('rejects inconsistent state %j', overrides => expect(decode(overrides)).toBeNull());
  it('validates started states without demanding a reconstructed play history', () => {
    expect(decode({ matched: [], moves: 0, elapsedMs: 0, selection: { kind: 'closed' } })).toBeNull();
    expect(decode({ matched: [], moves: 0, elapsedMs: 1000, selection: { kind: 'one', index: 1 } })).not.toBeNull();
    expect(decode({ matched: [], moves: 20, selection: { kind: 'closed' } })).not.toBeNull();
    expect(decode({ matched: [], moves: 0, elapsedMs: 0, selection: { kind: 'closed' }, started: false })).not.toBeNull();
  });
  it('checks UTF-8 bytes, required keys, malformed JSON and completion', () => {
    expect(decodeSnapshot(' '.repeat(SNAPSHOT_BYTES) + JSON.stringify(valid))).toBeNull();
    expect(decodeSnapshot('é'.repeat(SNAPSHOT_BYTES / 2 + 1))).toBeNull();
    expect(decodeSnapshot('{')).toBeNull();
    expect(decodeSnapshot('{}')).toBeNull();
    expect(decode({ matched: Array.from({ length: 16 }, (_, i) => i), moves: 8, selection: { kind: 'closed' } })).not.toBeNull();
  });
});
