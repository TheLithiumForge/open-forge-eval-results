import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, MAX_SNAPSHOT_BYTES } from './snapshot.ts';
import { activateCard, advanceGame, createGame, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';

const snapshot = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};
const decode = (updates: Record<string, unknown>) => decodeSnapshot(JSON.stringify({ ...snapshot, ...updates }));

describe('snapshot validation (D05–D07, D10)', () => {
  it('decodes and round trips the literal example', () => {
    const game = decode({});
    expect(game?.matched).toEqual([0, 11]);
    expect(game?.selection).toEqual(snapshot.selection);
    if (!game) throw new Error('Expected valid snapshot');
    expect(JSON.parse(encodeSnapshot(game))).toEqual(snapshot);
  });
  it('round trips initial, first reveal, match and mismatch states', () => {
    const game = createGame('np1-4-1');
    if (!game) throw new Error('Invalid test board');
    const one = activateCard(game, 0);
    const matched = activateCard(one, 11);
    const miss = advanceGame(activateCard(activateCard(matched, 1), 2), 500);
    for (const state of [game, one, matched, miss]) expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
  });
  it.each([
    { extra: 1 }, { version: 2 }, { boardCode: 'np1-4-01' }, { started: 1 },
    { moves: -1 }, { moves: 1.5 }, { moves: MAX_MOVES + 1 }, { moves: null },
    { elapsedMs: -1 }, { elapsedMs: MAX_ELAPSED_MS + 1 }, { elapsedMs: 0.5 },
    { matched: [0] }, { matched: [0, 0] }, { matched: [0, 1] }, { matched: [0, 16] },
    { matched: [0, 11, 11, 0] }, { matched: ['0', 11] }, { matched: null },
    { moves: 1 }, { started: false }, { selection: { kind: 'closed', extra: 1 } },
    { selection: { kind: 'one', index: 0 } }, { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    ...[0, 801, 0.5].map(remainingMs => ({ selection: { ...snapshot.selection, remainingMs } })),
  ])('rejects inconsistent or unsupported data: %j', updates => {
    expect(decode(updates)).toBeNull();
  });
  it('validates unstarted and started zero-move states', () => {
    expect(decode({ matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false })).not.toBeNull();
    expect(decode({ matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0 })).toBeNull();
    expect(decode({ matched: [], selection: { kind: 'one', index: 1 }, moves: 0 })).not.toBeNull();
  });
  it('checks UTF-8 bytes and malformed JSON', () => {
    expect(decodeSnapshot('{')).toBeNull();
    expect(decodeSnapshot('null')).toBeNull();
    const text = JSON.stringify(snapshot);
    expect(decodeSnapshot(text + ' '.repeat(MAX_SNAPSHOT_BYTES - new TextEncoder().encode(text).length))).not.toBeNull();
    expect(decodeSnapshot(text + ' '.repeat(MAX_SNAPSHOT_BYTES))).toBeNull();
    expect(decodeSnapshot('"' + 'é'.repeat(MAX_SNAPSHOT_BYTES / 2) + '"')).toBeNull();
  });
  it('accepts a completed state only with a closed selection and adequate moves', () => {
    const completed = { matched: Array.from({ length: 16 }, (_, index) => index), selection: { kind: 'closed' }, moves: 8 };
    expect(decode(completed)).not.toBeNull();
    expect(decode({ ...completed, moves: 7 })).toBeNull();
    expect(decode({ ...completed, selection: { kind: 'one', index: 0 } })).toBeNull();
  });
  it('exports whole milliseconds and preserves a pending sub-millisecond miss as 1ms', () => {
    const game = createGame('np1-4-1');
    if (!game) throw new Error('Invalid test board');
    const miss = advanceGame(activateCard(activateCard(game, 0), 1), 799.75);
    const restored = decodeSnapshot(encodeSnapshot(miss));
    expect(restored?.elapsedMs).toBe(799);
    expect(restored?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  });
});
