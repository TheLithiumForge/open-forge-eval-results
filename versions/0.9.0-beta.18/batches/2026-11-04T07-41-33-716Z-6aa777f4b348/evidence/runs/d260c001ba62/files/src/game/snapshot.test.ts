import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';
import { createGame } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';

const sample = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};

describe('snapshot validation', () => {
  it('round trips the documented snapshot', () => {
    const state = decodeSnapshot(JSON.stringify(sample));
    expect(state?.matched).toEqual([0, 11]);
    if (!state) throw new Error('Missing sample');
    expect(JSON.parse(encodeSnapshot(state))).toEqual(sample);
  });
  it('round trips each legitimate state', () => {
    const closed = createGame('np1-4-1');
    if (!closed) throw new Error('Missing game');
    const one = activateCard(closed, 0);
    const mismatch = activateCard(one, 1);
    const match = activateCard(one, 11);
    for (const state of [closed, one, mismatch, match, advanceGame(mismatch, 800)]) {
      expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    }
    const fractional = advanceGame(mismatch, 799.75);
    expect(decodeSnapshot(encodeSnapshot(fractional))?.selection)
      .toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  });
  const invalid = [
    { extra: 1 }, { version: 2 }, { boardCode: ' np1-4-1' }, { matched: [0] },
    { matched: [0, 0] }, { matched: [0, 1] }, { matched: [0, 11, 16] },
    { selection: { kind: 'closed', extra: 0 } }, { selection: { kind: 'one', index: 11 } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    ...[0, 801, 1.5].map(remainingMs => ({ selection: { ...sample.selection, remainingMs } })),
    { moves: 1 }, { moves: 1000000 }, { moves: -1 }, { moves: 2.5 },
    { elapsedMs: 360000000 }, { elapsedMs: -1 }, { elapsedMs: 0.5 }, { started: false },
    { started: 1 }, { selection: null },
  ];
  it.each(invalid)('rejects inconsistent fields %j', fields => {
    expect(decodeSnapshot(JSON.stringify({ ...sample, ...fields }))).toBeNull();
  });
  it('requires the exact schema and started invariants', () => {
    const clean = { ...sample, matched: [], moves: 0, elapsedMs: 0, selection: { kind: 'closed' }, started: false };
    expect(decodeSnapshot(JSON.stringify(clean))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...clean, started: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...clean, started: true, selection: { kind: 'one', index: 0 } }))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...clean, elapsedMs: 1 }))).toBeNull();
    const { started: omitted, ...incomplete } = sample;
    expect(omitted).toBe(true);
    expect(decodeSnapshot(JSON.stringify(incomplete))).toBeNull();
  });
  it('enforces byte limits and rejects malformed JSON', () => {
    for (const text of ['{', 'null', '[]', JSON.stringify(sample) + ' '.repeat(SNAPSHOT_BYTE_LIMIT),
      JSON.stringify(sample) + '　'.repeat(22000)]) expect(decodeSnapshot(text)).toBeNull();
  });
});
