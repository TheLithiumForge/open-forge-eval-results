import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

const UNNAMED = {
  version: 1,
  boardCode: EXAMPLE_CODE,
  matched: [11, 0],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2,
  elapsedMs: 1500,
  started: true,
};

test('snapshot object fields and nested selection fields accept every position of version', () => {
  for (const snapshot of [UNNAMED, { ...UNNAMED, version: 2, name: 'Café' }]) {
    const expected = decodeSnapshot(JSON.stringify(snapshot));
    assert.ok(expected);
    const entries = Object.entries(snapshot);
    for (let offset = 1; offset < entries.length; offset += 1) {
      const reordered = Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]);
      reordered.selection = { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' };
      assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), expected);
    }
  }
  assert.ok(decodeSnapshot(JSON.stringify({ ...UNNAMED, selection: { index: 1, kind: 'one' } })));
});

test('valid saved state does not need a reconstructed history of elapsed turns', () => {
  const variants = [
    { ...UNNAMED, elapsedMs: 0, selection: { ...UNNAMED.selection, remainingMs: 1 } },
    { ...UNNAMED, moves: 999999, elapsedMs: 359999999 },
    { ...UNNAMED, moves: 1, matched: [], selection: { kind: 'closed' }, elapsedMs: 0 },
    {
      ...UNNAMED,
      moves: 8,
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: 'closed' },
      elapsedMs: 0,
    },
  ];
  for (const snapshot of variants) {
    assert.ok(decodeSnapshot(JSON.stringify(snapshot)));
    assert.ok(decodeSnapshot(JSON.stringify({ ...snapshot, version: 2, name: 'Saved' })));
  }
});

test('named and unnamed versions keep state validation strict with reordered input', () => {
  const invalid = [
    { ...UNNAMED, moves: 1 },
    { ...UNNAMED, moves: 1000000 },
    { ...UNNAMED, elapsedMs: 360000000 },
    { ...UNNAMED, matched: [0] },
    { ...UNNAMED, matched: [0, 11, 0, 11] },
    { ...UNNAMED, selection: { ...UNNAMED.selection, extra: true } },
    { ...UNNAMED, selection: { ...UNNAMED.selection, remainingMs: 0 } },
    { ...UNNAMED, selection: { ...UNNAMED.selection, remainingMs: 800.5 } },
    { ...UNNAMED, selection: { kind: 'one', index: 0 } },
    { ...UNNAMED, started: false },
    { ...UNNAMED, started: 'true' },
  ];
  for (const snapshot of invalid)
    for (const format of [snapshot, { ...snapshot, version: 2, name: 'Saved' }]) {
      const reordered = Object.fromEntries(Object.entries(format).reverse());
      assert.equal(decodeSnapshot(JSON.stringify(reordered)), null);
    }
});
