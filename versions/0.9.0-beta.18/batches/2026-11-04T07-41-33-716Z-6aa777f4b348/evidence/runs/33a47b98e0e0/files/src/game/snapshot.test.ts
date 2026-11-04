import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { createGame, isWon, type GameState } from './state.ts';

function validSnapshot(): Record<string, unknown> {
  return {
    version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' },
    moves: 0, elapsedMs: 0, started: false,
  };
}

function decode(value: unknown): ReturnType<typeof decodeSnapshot> {
  return decodeSnapshot(JSON.stringify(value));
}

function restore(value: unknown): GameState {
  const state = decode(value);
  if (state === null) throw new Error('Snapshot fixture must be valid');
  return state;
}

describe('version 1 snapshots', () => {
  it('round trips initial, one-card, mismatch, and completed states', () => {
    const initial = createGame('np1-4-1');
    if (initial === null) throw new Error('Literal fixture must be valid');
    expect(decodeSnapshot(encodeSnapshot(initial))).toMatchObject({ started: false, moves: 0 });
    const one = { ...validSnapshot(), selection: { kind: 'one', index: 0 }, started: true };
    expect(decodeSnapshot(encodeSnapshot(restore(one)))).toMatchObject({ selection: one.selection });
    const mismatch = { ...validSnapshot(), selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 300 }, moves: 1, started: true };
    expect(decodeSnapshot(encodeSnapshot(restore(mismatch)))).toMatchObject({ selection: mismatch.selection });
    const complete = { ...validSnapshot(), matched: Array.from({ length: 16 }, (_unused, index) => index), moves: 8, started: true };
    const completed = decode(complete);
    expect(completed).not.toBeNull();
    if (completed !== null) expect(isWon(completed)).toBe(true);
  });

  it('accepts the documented matched-pair and pending-mismatch example', () => {
    const sample = {
      version: 1, boardCode: 'np1-4-1', matched: [0, 11],
      selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
      moves: 2, elapsedMs: 1500, started: true,
    };
    expect(decode(sample)).toMatchObject({ matched: [0, 11], selection: sample.selection, moves: 2 });
    const missingMismatchMove = { ...sample, moves: 1 };
    expect(decode(missingMismatchMove)).toBeNull();
  });

  it('rejects malformed JSON, versions, extra keys, and invalid board codes', () => {
    expect(decodeSnapshot('{')).toBeNull();
    expect(decodeSnapshot(' '.repeat(65_537))).toBeNull();
    expect(decode({ ...validSnapshot(), version: 2 })).toBeNull();
    expect(decode({ ...validSnapshot(), extra: true })).toBeNull();
    expect(decode({ ...validSnapshot(), boardCode: 'np1-4-1\n' })).toBeNull();
    expect(decode({ ...validSnapshot(), selection: { kind: 'closed', index: 2 } })).toBeNull();
  });

  it('requires unique whole matched pairs and unmatched in-range selections', () => {
    expect(decode({ ...validSnapshot(), matched: [0] })).toBeNull();
    expect(decode({ ...validSnapshot(), matched: [0, 1], moves: 1, started: true })).toBeNull();
    expect(decode({ ...validSnapshot(), matched: [0, 11, 0], moves: 1, started: true })).toBeNull();
    expect(decode({ ...validSnapshot(), matched: [0, 11], selection: { kind: 'one', index: 0 }, moves: 1, started: true })).toBeNull();
    expect(decode({ ...validSnapshot(), selection: { kind: 'one', index: 16 }, started: true })).toBeNull();
  });

  it('validates mismatch indices, face values, remaining time, and exact selection keys', () => {
    const base = { ...validSnapshot(), moves: 1, started: true };
    expect(decode({ ...base, selection: { kind: 'mismatch', first: 0, second: 0, remainingMs: 800 } })).toBeNull();
    expect(decode({ ...base, selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 800 } })).toBeNull();
    expect(decode({ ...base, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 0 } })).toBeNull();
    expect(decode({ ...base, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 801 } })).toBeNull();
    expect(decode({ ...base, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 5, extra: 2 } })).toBeNull();
  });

  it('enforces move, elapsed, and not-started consistency limits', () => {
    expect(decode({ ...validSnapshot(), matched: [0, 11], moves: 0, started: true })).toBeNull();
    expect(decode({ ...validSnapshot(), selection: { kind: 'one', index: 0 }, started: true })).not.toBeNull();
    expect(decode({ ...validSnapshot(), selection: { kind: 'one', index: 0 } })).toBeNull();
    expect(decode({ ...validSnapshot(), started: true })).toBeNull();
    expect(decode({ ...validSnapshot(), moves: 1_000_000 })).toBeNull();
    expect(decode({ ...validSnapshot(), elapsedMs: 360_000_000 })).toBeNull();
    expect(decode({ ...validSnapshot(), elapsedMs: -1 })).toBeNull();
  });
});
