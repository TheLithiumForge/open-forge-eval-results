import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, MAX_SNAPSHOT_BYTES } from './snapshot.ts';
import { activateCard, advanceGame, createGame } from './state.ts';

const fixture = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};

describe('version 1 snapshots', () => {
  it('restores the documented pending mismatch and round-trips it', () => {
    const state = decodeSnapshot(JSON.stringify(fixture));
    expect(state?.matched).toEqual([0, 11]);
    expect(state?.selection).toEqual(fixture.selection);
    if (!state) throw new Error('Expected valid snapshot.');
    expect(JSON.parse(encodeSnapshot(state))).toEqual(fixture);
  });

  it('exports whole elapsed milliseconds and a positive remaining mismatch', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Expected fixture board.');
    const state = advanceGame(activateCard(activateCard(initial, 0), 1), 799.9);
    const decoded = decodeSnapshot(encodeSnapshot(state));
    expect(decoded?.elapsedMs).toBe(799);
    expect(decoded?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(state.selection.kind).toBe('mismatch');
  });

  it.each([
    { extra: true }, { version: 2 }, { boardCode: 'np1-4-01' }, { matched: [0] },
    { matched: [0, 11, 0, 11] }, { matched: [0, 1] }, { matched: [-1, 11] }, { matched: [0, 16] },
    { moves: 1 }, { moves: 1000000 }, { moves: 2.5 }, { elapsedMs: 360000000 },
    { elapsedMs: -1 }, { started: false }, { started: 'true' },
    { selection: { kind: 'closed', index: 1 } },
    { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 1, extra: true } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
  ])('rejects inconsistent or unknown data %j', changes => {
    expect(decodeSnapshot(JSON.stringify({ ...fixture, ...changes }))).toBeNull();
  });

  it('accepts unfinished fresh and first-card states without reconstructing history', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Expected fixture board.');
    expect(decodeSnapshot(encodeSnapshot(initial))).toEqual(initial);
    const first = activateCard(initial, 0);
    expect(decodeSnapshot(encodeSnapshot(first))).toEqual(first);
    expect(decodeSnapshot(JSON.stringify({ ...fixture, matched: [], moves: 0, selection: { kind: 'closed' } }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...fixture, matched: [], moves: 10, selection: { kind: 'closed' } }))).not.toBeNull();
  });

  it('accepts completed progress only with a closed selection and enough moves', () => {
    const completed = { ...fixture, matched: Array.from({ length: 16 }, (_, index) => index), moves: 8, selection: { kind: 'closed' } };
    expect(decodeSnapshot(JSON.stringify(completed))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...completed, moves: 7 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...completed, selection: { kind: 'one', index: 0 } }))).toBeNull();
  });

  it('rejects malformed, missing and oversized UTF-8 JSON', () => {
    for (const text of ['{', 'null', '[]', '{}', JSON.stringify({ ...fixture, moves: null })]) {
      expect(decodeSnapshot(text)).toBeNull();
    }
    const base = JSON.stringify(fixture);
    expect(decodeSnapshot(base + ' '.repeat(MAX_SNAPSHOT_BYTES - base.length))).not.toBeNull();
    expect(decodeSnapshot(base + ' '.repeat(MAX_SNAPSHOT_BYTES - base.length + 1))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...fixture, boardCode: 'é'.repeat(40000) }))).toBeNull();
    const { version, ...missingVersion } = fixture;
    expect(version).toBe(1);
    expect(decodeSnapshot(JSON.stringify(missingVersion))).toBeNull();
  });
});
