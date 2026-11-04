import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';
import { SelectionKind } from './selection.ts';

const SELECTION = { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' };
const FIELDS: readonly (readonly [string, unknown])[] = [
  ['version', 1],
  ['boardCode', 'np1-4-1'],
  ['matched', [0, 11]],
  ['selection', SELECTION],
  ['moves', 2],
  ['elapsedMs', 1500],
  ['started', true],
];
const NAMED_FIELDS: readonly (readonly [string, unknown])[] = [
  ['name', 'Café'],
  ['version', 2],
  ...FIELDS.filter(([key]) => key !== 'version'),
];

test('pasted snapshots accept every field first and reversed nested property order', () => {
  for (const fields of [FIELDS, NAMED_FIELDS]) {
    for (let first = 0; first < fields.length; first += 1) {
      const rotated = [...fields.slice(first), ...fields.slice(0, first)];
      const state = decodeSnapshot(JSON.stringify(Object.fromEntries(rotated)));
      assert.ok(state);
      assert.equal(state.name, fields === FIELDS ? '' : 'Café');
      assert.equal(state.moves, 2);
      assert.equal(state.elapsedMs, 1500);
      assert.deepEqual(state.matched, [0, 11]);
      assert.deepEqual(state.selection, {
        kind: SelectionKind.mismatch,
        first: 1,
        second: 2,
        remainingMs: 300,
      });
    }
  }
});

test('property reordering still rejects missing, unknown and invalid fields', () => {
  for (const fields of [FIELDS, NAMED_FIELDS]) {
    const valid = Object.fromEntries([...fields].reverse());
    assert.ok(decodeSnapshot(JSON.stringify(valid)));
    for (const key of Object.keys(valid)) {
      const missing = { ...valid };
      delete missing[key];
      assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
    }
    for (const invalid of [
      { ...valid, extra: true },
      { ...valid, matched: [0] },
      { ...valid, moves: 1 },
      { ...valid, selection: { ...SELECTION, extra: true } },
    ])
      assert.equal(decodeSnapshot(JSON.stringify(invalid)), null);
  }
});
