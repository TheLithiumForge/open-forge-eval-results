import { describe, expect, it } from 'vitest';
import { activateCard, advanceGame } from './rules.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTES } from './snapshot.ts';
import { createGame } from './state.ts';

const base = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
const decode = (overrides: Record<string, unknown>) => decodeSnapshot(JSON.stringify({ ...base, ...overrides }));

describe('snapshot format 1', () => {
  it('restores the specified mismatch and round trips', () => {
    const game = decode({});
    expect(game?.matched).toEqual([0, 11]);
    expect(game?.selection).toEqual(base.selection);
    if (!game) throw new Error('Expected valid snapshot.');
    expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
    expect(advanceGame(game, 299).selection.kind).toBe('mismatch');
    expect(advanceGame(game, 300).selection.kind).toBe('closed');
  });
  it('round trips initial, one-card and completed states; quantizes fractional time', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Expected valid board.');
    expect(decodeSnapshot(encodeSnapshot(initial))).toEqual(initial);
    const one = activateCard(initial, 0);
    expect(decodeSnapshot(encodeSnapshot(one))).toEqual(one);
    const miss = advanceGame(activateCard(one, 1), 799.9);
    const restored = decodeSnapshot(encodeSnapshot(miss));
    expect(restored?.elapsedMs).toBe(799);
    expect(restored?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(decode({ matched: Array.from({ length: 16 }, (_, i) => i), selection: { kind: 'closed' }, moves: 8 })).not.toBeNull();
  });
  it.each([
    { extra: true }, { version: 2 }, { boardCode: ' np1-4-1' },
    { matched: [0] }, { matched: [0, 0] }, { matched: [0, 1] }, { matched: [0, 16] },
    { moves: 1 }, { moves: -1 }, { moves: 1000000 }, { moves: 1.5 },
    { elapsedMs: 360000000 }, { elapsedMs: -1 }, { elapsedMs: 1.5 },
    { started: false }, { started: 1 }, { selection: { kind: 'closed', index: 1 } },
    { selection: { kind: 'one', index: 0 } }, { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    ...[0, 801, 1.5].map(remainingMs => ({ selection: { ...base.selection, remainingMs } })),
  ])('rejects invalid progress %j', invalid => expect(decode(invalid)).toBeNull());
  it('validates start-state coherence without reconstructing history', () => {
    expect(decode({ matched: [], selection: { kind: 'closed' }, moves: 0 })).toBeNull();
    expect(decode({ matched: [], selection: { kind: 'one', index: 0 }, moves: 0 })).not.toBeNull();
    expect(decode({ matched: [], selection: { kind: 'closed' }, moves: 50 })).not.toBeNull();
    expect(decode({ matched: [], selection: { kind: 'closed' }, started: false, moves: 0, elapsedMs: 1 })).toBeNull();
  });
  it('rejects missing keys, malformed JSON and UTF-8 byte overflow', () => {
    expect(decodeSnapshot('{}')).toBeNull();
    expect(decodeSnapshot('{')).toBeNull();
    expect(decodeSnapshot('null')).toBeNull();
    expect(decodeSnapshot(' '.repeat(SNAPSHOT_BYTES) + JSON.stringify(base))).toBeNull();
    expect(decodeSnapshot('"' + 'é'.repeat(SNAPSHOT_BYTES / 2) + '"')).toBeNull();
  });
});
