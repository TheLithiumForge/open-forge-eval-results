import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

// Written independently of the encoder: version need not be the first JSON member.
const FIELDS = [
  ['boardCode', 'np1-4-1'],
  ['matched', [0, 11]],
  ['selection', { second: 2, remainingMs: 300, first: 1, kind: 'mismatch' }],
  ['moves', 2],
  ['elapsedMs', 1500],
  ['started', true],
  ['version', 1],
] as const;

test('snapshot members and nested selections load regardless of property order', () => {
  for (let offset = 0; offset < FIELDS.length; offset += 1) {
    const fields = [...FIELDS.slice(offset), ...FIELDS.slice(0, offset)];
    for (const order of [fields, [...fields].reverse()]) {
      const state = decodeSnapshot(JSON.stringify(Object.fromEntries(order)));
      assert.ok(state, `valid member order: ${order.map(([key]) => key).join(', ')}`);
      assert.deepEqual(state.matched, [0, 11]);
      assert.deepEqual(state.selection, {
        kind: 'mismatch',
        first: 1,
        second: 2,
        remainingMs: 300,
      });
      assert.equal(state.moves, 2);
      assert.equal(state.elapsedMs, 1500);
    }
  }
});

test('reordered snapshots still reject missing fields, substitutions and unknown keys', () => {
  const valid = Object.fromEntries(FIELDS);
  for (const [key] of FIELDS) {
    const missing = { ...valid };
    delete missing[key];
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
    assert.equal(decodeSnapshot(JSON.stringify({ ...missing, extra: true })), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, extra: true })), null);
});
