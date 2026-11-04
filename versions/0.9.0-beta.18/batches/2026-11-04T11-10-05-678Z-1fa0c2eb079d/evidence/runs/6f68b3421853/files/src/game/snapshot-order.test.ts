import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot, SNAPSHOT_VERSION } from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const SNAPSHOT = {
  version: SNAPSHOT_VERSION,
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.closed },
  moves: 0,
  elapsedMs: 0,
  started: false,
};

test('snapshot fields can appear in every position without changing restored progress', () => {
  const expected = decodeSnapshot(JSON.stringify(SNAPSHOT));
  assert.ok(expected, 'valid baseline');
  const fields = Object.entries(SNAPSHOT);
  for (let offset = 0; offset < fields.length; offset++) {
    const rotated = [...fields.slice(offset), ...fields.slice(0, offset)];
    for (const entries of [rotated, [...rotated].reverse()])
      assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(entries))), expected);
  }
});

test('selection fields accept reversed order and top-level fields remain exact', () => {
  for (const selection of [
    { kind: SelectionKind.closed },
    { kind: SelectionKind.one, index: 0 },
    { kind: SelectionKind.mismatch, first: 0, second: 1, remainingMs: 300 },
  ]) {
    const progress = { ...SNAPSHOT, started: true, moves: 1, selection };
    const reversed = Object.fromEntries(Object.entries(selection).reverse());
    const restored = decodeSnapshot(JSON.stringify({ ...progress, selection: reversed }));
    assert.ok(restored);
    assert.deepEqual(restored.selection, selection);
  }
  const fields = Object.entries(SNAPSHOT);
  for (const [missing] of fields)
    assert.equal(
      decodeSnapshot(JSON.stringify(Object.fromEntries(fields.filter(([key]) => key !== missing)))),
      null,
    );
  for (const key of ['extra', 'name', '__proto__'])
    assert.equal(
      decodeSnapshot(JSON.stringify(Object.fromEntries([...fields, [key, 'unexpected']]))),
      null,
    );
});
