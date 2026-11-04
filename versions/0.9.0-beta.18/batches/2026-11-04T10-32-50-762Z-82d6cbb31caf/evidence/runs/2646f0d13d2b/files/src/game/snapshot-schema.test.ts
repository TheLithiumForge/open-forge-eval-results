import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

const UNNAMED = {
  boardCode: 'np1-4-1',
  matched: [11, 0],
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  moves: 2,
  elapsedMs: 1500,
  started: true,
  version: 1,
};
const NAMED = { ...UNNAMED, version: 2, name: 'Café' };

test('both snapshot versions accept fields in every leading position and reversed order', () => {
  for (const value of [UNNAMED, NAMED]) {
    const entries = Object.entries(value);
    const expected = decodeSnapshot(JSON.stringify(value));
    assert.ok(expected);
    assert.deepEqual(expected.selection, {
      kind: 'mismatch',
      first: 1,
      second: 2,
      remainingMs: 300,
    });
    assert.equal(expected.boardCode, 'np1-4-1');
    assert.deepEqual(expected.matched, [11, 0]);
    for (let start = 0; start < entries.length; start++) {
      const rotated = [...entries.slice(start), ...entries.slice(0, start)];
      for (const order of [rotated, [...rotated].reverse()])
        assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(order))), expected);
    }
  }
});

test('both snapshot versions reject missing and unknown fields regardless of order', () => {
  for (const value of [UNNAMED, NAMED]) {
    const entries = Object.entries(value);
    for (let missing = 0; missing < entries.length; missing++) {
      const incomplete = entries.filter((_, index) => index !== missing);
      assert.equal(decodeSnapshot(JSON.stringify(Object.fromEntries(incomplete))), null);
    }
    for (const extra of [
      { extra: true, ...value },
      { ...value, deck: [] },
    ])
      assert.equal(decodeSnapshot(JSON.stringify(extra)), null);
    for (const version of [0, 3, '1', null])
      assert.equal(decodeSnapshot(JSON.stringify({ ...value, version })), null);
  }
});

test('named snapshots enforce the same progress and selection constraints as unnamed saves', () => {
  for (const value of [UNNAMED, NAMED]) {
    for (const invalid of [
      { moves: 1 },
      { moves: 1000000 },
      { elapsedMs: 360000000 },
      { started: false },
      { matched: [0] },
      { matched: [0, 11, 11] },
      { selection: { kind: 'one', index: 0 } },
      { selection: { ...value.selection, remainingMs: 0 } },
      { selection: { ...value.selection, remainingMs: 801 } },
      { selection: { ...value.selection, first: 2, second: 6 } },
      { selection: { ...value.selection, unknown: true } },
    ])
      assert.equal(decodeSnapshot(JSON.stringify({ ...value, ...invalid })), null);
  }
});
