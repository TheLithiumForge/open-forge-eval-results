import { describe, expect, it } from 'vitest';
import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';
import { createGame } from './state.ts';

const snapshot = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};

describe('version 1 snapshots', () => {
  it('round trips fresh, selected, matched and mismatching states', () => {
    const initial = createGame('np1-4-1');
    const selected = activateCard(initial, 0);
    const matched = activateCard(selected, 11);
    const mismatch = activateCard(activateCard(matched, 1), 2);
    for (const state of [initial, selected, matched, mismatch]) {
      expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    }
  });

  it('accepts the documented snapshot and unordered matched whole pairs', () => {
    const state = decodeSnapshot(JSON.stringify(snapshot));
    expect(state).toMatchObject({ matched: [0, 11], moves: 2, elapsedMs: 1500 });
    expect(state?.selection).toEqual(snapshot.selection);
    expect(decodeSnapshot(JSON.stringify({ ...snapshot, matched: [11, 0] }))).not.toBeNull();
    expect(decodeSnapshot(JSON.stringify({
      ...snapshot, matched: [], selection: { kind: 'closed' }, moves: 100,
    }))).not.toBeNull();
  });

  it('exports fractional active time as whole milliseconds without losing a pending mismatch', () => {
    const mismatch = activateCard(activateCard(createGame('np1-4-1'), 0), 1);
    const state = advanceGame(mismatch, 799.75);
    const restored = decodeSnapshot(encodeSnapshot(state));
    expect(restored?.elapsedMs).toBe(799);
    expect(restored?.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    expect(state.selection).toMatchObject({ remainingMs: 0.25 });
  });

  it.each([
    { version: 2 }, { extra: 1 }, { boardCode: 'np1-4-1\n' },
    { matched: [0] }, { matched: [0, 0] }, { matched: [0, 1] }, { matched: [-1, 11] },
    { matched: [0, 16] }, { matched: [0.5, 11] }, { matched: '0,11' },
    { moves: 1 }, { moves: -1 }, { moves: 1.5 }, { moves: 1000000 },
    { elapsedMs: -1 }, { elapsedMs: 1.5 }, { elapsedMs: 360000000 },
    { started: false }, { started: 'true' },
    { selection: { kind: 'closed', extra: 1 } },
    { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 4, second: 5, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0.5 } },
  ])('rejects inconsistent or unknown snapshot fields %j', (patch) => {
    expect(decodeSnapshot(JSON.stringify({ ...snapshot, ...patch }))).toBeNull();
  });

  it('enforces not-started and started-zero-move constraints and completed selection', () => {
    const initial = createGame('np1-4-1');
    const base: unknown = JSON.parse(encodeSnapshot(initial));
    expect(decodeSnapshot(JSON.stringify({ ...snapshot, matched: [], moves: 0, selection: { kind: 'closed' } })))
      .toBeNull();
    expect(decodeSnapshot(encodeSnapshot({ ...initial, elapsedMs: 1 }))).toBeNull();
    expect(decodeSnapshot(encodeSnapshot({ ...initial, moves: 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify(base))).toEqual(initial);
    const completed = {
      ...initial, matched: Array.from({ length: 16 }, (_, index) => index),
      moves: 8, started: true,
    };
    expect(decodeSnapshot(encodeSnapshot(completed))).toEqual(completed);
    expect(decodeSnapshot(encodeSnapshot({ ...completed, selection: { kind: 'one', index: 0 } }))).toBeNull();
  });

  it('rejects malformed, missing and oversized input by UTF-8 bytes', () => {
    for (const text of ['{', 'null', '[]', '{}', JSON.stringify({ ...snapshot, selection: null })]) {
      expect(decodeSnapshot(text)).toBeNull();
    }
    const valid = encodeSnapshot(createGame('np1-4-1'));
    expect(decodeSnapshot(valid + ' '.repeat(SNAPSHOT_BYTE_LIMIT))).toBeNull();
    expect(decodeSnapshot(valid + ' '.repeat(SNAPSHOT_BYTE_LIMIT - new TextEncoder().encode(valid).length)))
      .not.toBeNull();
  });
});
