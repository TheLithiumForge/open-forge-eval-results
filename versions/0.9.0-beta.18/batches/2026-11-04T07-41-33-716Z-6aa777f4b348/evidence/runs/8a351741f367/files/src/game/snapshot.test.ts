import { describe, expect, it } from 'vitest';
import { createGame } from './state.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';
import { activateCard, advanceGame, MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';
import { parseLimitedJson } from './formatValidation.ts';

const base = { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' },
  moves: 0, elapsedMs: 0, started: false };
const sample = { ...base, matched: [0, 11], selection: {
  kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true };

describe('strict version 1 snapshots', () => {
  it('round-trips initial, revealed, mismatch, matched and completed states', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid fixture.');
    const one = activateCard(initial, 0);
    const mismatch = advanceGame(activateCard(one, 1), 500);
    const matched = activateCard(one, 11);
    let complete = initial;
    for (const [first, second] of [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]]) {
      if (first === undefined || second === undefined) throw new Error('Invalid test pair.');
      complete = activateCard(activateCard(complete, first), second);
    }
    for (const state of [initial, one, mismatch, matched, complete]) {
      expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    }
  });

  it('accepts the documented snapshot and stated constraints without inventing history rules', () => {
    expect(decodeSnapshot(JSON.stringify(sample))?.selection).toEqual(sample.selection);
    expect(decodeSnapshot(JSON.stringify({ ...base, started: true, moves: 1 }))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...sample, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS }))).not.toBeNull();
  });

  it('exports fractional session time as whole ms with at least one remaining ms', () => {
    const state = decodeSnapshot(JSON.stringify(sample));
    if (!state) throw new Error('Invalid fixture.');
    const exported = decodeSnapshot(encodeSnapshot(advanceGame(state, 299.75)));
    expect(exported?.elapsedMs).toBe(1799);
    expect(exported?.selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 1 });
  });

  it.each([
    { ...base, extra: 1 }, { ...base, version: 2 }, { ...base, boardCode: 'np1-4-1\n' },
    { ...base, started: 0 }, { ...base, moves: -1 }, { ...base, moves: 0.5 },
    { ...base, moves: MAX_MOVES + 1 }, { ...base, elapsedMs: MAX_ELAPSED_MS + 1 },
    { ...base, elapsedMs: 1 }, { ...base, matched: [0] }, { ...sample, matched: [0, 0] },
    { ...sample, matched: [0, 1] }, { ...sample, matched: [0, 16] },
    { ...sample, selection: { kind: 'closed', extra: 1 } },
    { ...sample, selection: { kind: 'one', index: 0 } },
    { ...sample, selection: { kind: 'one', index: -1 } },
    { ...sample, selection: { kind: 'one', index: 2, extra: 1 } },
    { ...sample, selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { ...sample, selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { ...sample, selection: { kind: 'mismatch', first: 0, second: 2, remainingMs: 300 } },
    { ...sample, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { ...sample, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { ...sample, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
    { ...sample, selection: { kind: 'unknown' } }, { ...sample, moves: 1 },
    { ...base, started: true }, { ...base, selection: { kind: 'one', index: 0 } },
    { ...sample, started: false },
  ])('rejects inconsistent or noncanonical state %#', (value) => {
    expect(decodeSnapshot(JSON.stringify(value))).toBeNull();
  });

  it.each(['null', '[]', '{', '{}', 'true'])('rejects malformed or nonobject JSON %s', (text) => {
    expect(decodeSnapshot(text)).toBeNull();
  });

  it('enforces exact JSON byte limits, counting multibyte characters', () => {
    const text = JSON.stringify(base);
    expect(decodeSnapshot(text.padEnd(SNAPSHOT_MAX_BYTES, ' '))).not.toBeNull();
    expect(decodeSnapshot(text.padEnd(SNAPSHOT_MAX_BYTES + 1, ' '))).toBeNull();
    expect(parseLimitedJson('"é"', 4)).toBe('é');
    expect(parseLimitedJson('"é"', 3)).toBeNull();
  });
});
