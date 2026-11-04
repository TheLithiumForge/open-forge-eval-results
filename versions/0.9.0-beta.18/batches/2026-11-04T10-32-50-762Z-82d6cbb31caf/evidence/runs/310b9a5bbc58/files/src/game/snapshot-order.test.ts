import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

const PROGRESS = {
  boardCode: 'np1-4-1',
  matched: [0, 11],
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  moves: 2,
  elapsedMs: 1500,
  started: true,
  version: 1,
};

test('pasted snapshots accept every field first and reversed field order', () => {
  for (const snapshot of [PROGRESS, { ...PROGRESS, version: 2, name: 'Café' }]) {
    const entries = Object.entries(snapshot);
    const orders = [entries.toReversed()];
    for (let index = 0; index < entries.length; index++)
      orders.push([...entries.slice(index), ...entries.slice(0, index)]);
    for (const order of orders) {
      const state = decodeSnapshot(JSON.stringify(Object.fromEntries(order)));
      assert.ok(state, `accept field order ${order.map(([key]) => key).join(', ')}`);
      assert.equal(state.moves, 2);
      assert.equal(state.elapsedMs, 1500);
      assert.deepEqual(state.matched, [0, 11]);
      assert.deepEqual(state.selection, PROGRESS.selection);
    }
  }
});

test('reordered snapshots still require every declared field and reject extra fields', () => {
  for (const snapshot of [PROGRESS, { ...PROGRESS, version: 2, name: 'Café' }]) {
    const entries = Object.entries(snapshot);
    for (const [missing] of entries)
      assert.equal(
        decodeSnapshot(
          JSON.stringify(Object.fromEntries(entries.filter(([key]) => key !== missing))),
        ),
        null,
      );
    assert.equal(decodeSnapshot(JSON.stringify({ extra: true, ...snapshot })), null);
    assert.equal(decodeSnapshot(JSON.stringify({ ...snapshot, extra: true })), null);
  }
});
