import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { createGame } from './state.ts';
import { activateCard, advanceGame } from './turn.ts';

const base = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
const decode = (patch: Record<string, unknown> = {}) => decodeSnapshot(JSON.stringify({ ...base, ...patch }));

it('decodes the example exactly and round trips all selection states', () => {
  expect(decode()?.selection).toEqual(base.selection);
  const initial = createGame('np1-4-1');
  if (!initial) throw new Error('Invalid test board');
  const one = activateCard(initial, 0);
  const miss = advanceGame(activateCard(one, 1), 177);
  const match = activateCard(one, 11);
  for (const state of [initial, one, miss, match]) expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
});

describe('full snapshot validation', () => {
  const invalid: Record<string, unknown>[] = [
    { version: 2 }, { boardCode: ' np1-4-1' }, { extra: true }, { matched: [0] },
    { matched: [0, 0] }, { matched: [0, 1] }, { matched: [0, 11, 16] }, { matched: ['0', 11] },
    { moves: 1 }, { moves: -1 }, { moves: 1000000 }, { moves: 2.5 },
    { elapsedMs: 360000000 }, { elapsedMs: -1 }, { elapsedMs: 1.5 },
    { started: false }, { started: 1 }, { selection: { kind: 'closed', index: 1 } },
    { selection: { kind: 'one', index: 0 } }, { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'one', index: -1 } }, { selection: { kind: 'one', index: 1.5 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
    { selection: { kind: 'unknown' } },
  ];
  it.each(invalid)('rejects inconsistent data %j', patch => expect(decode(patch)).toBeNull());
  it.each(['{', 'null', '[]', '{}', ' '.repeat(65537)])('rejects malformed or oversized JSON', text => {
    expect(decodeSnapshot(text)).toBeNull();
  });
  it('requires all exact top-level fields', () => {
    for (const key of Object.keys(base)) {
      const copy: Record<string, unknown> = { ...base };
      delete copy[key];
      expect(decodeSnapshot(JSON.stringify(copy))).toBeNull();
    }
  });
  it('enforces unstarted and zero-move constraints without inventing history', () => {
    const clean = { matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
    expect(decode(clean)).not.toBeNull();
    expect(decode({ ...clean, elapsedMs: 1 })).toBeNull();
    expect(decode({ ...clean, started: true })).toBeNull();
    expect(decode({ ...clean, started: true, selection: { kind: 'one', index: 1 } })).not.toBeNull();
    expect(decode({ ...clean, started: true, moves: 12 })).not.toBeNull();
  });
  it('accepts unsorted pairs, completed games and capped values', () => {
    expect(decode({ matched: [11, 0], moves: 999999, elapsedMs: 359999999 })).not.toBeNull();
    expect(decode({ matched: Array.from({ length: 16 }, (_, i) => i), moves: 8,
      selection: { kind: 'closed' } })).not.toBeNull();
  });
});
