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
};

test('both snapshot versions accept every field first and reversed key order', () => {
  for (const snapshot of [
    { version: 1, ...PROGRESS },
    { version: 2, name: 'Café', ...PROGRESS },
  ]) {
    const expected = decodeSnapshot(JSON.stringify(snapshot));
    assert.ok(expected);
    const entries = Object.entries(snapshot).reverse();
    for (let index = 0; index < entries.length; index++) {
      const reordered = Object.fromEntries([...entries.slice(index), ...entries.slice(0, index)]);
      assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), expected);
    }
  }
});

test('reordered snapshots still require exactly their version-specific fields', () => {
  for (const snapshot of [
    { ...PROGRESS, version: 1 },
    { ...PROGRESS, name: 'Café', version: 2 },
  ]) {
    const entries = Object.entries(snapshot);
    assert.ok(decodeSnapshot(JSON.stringify(snapshot)));
    assert.equal(decodeSnapshot(JSON.stringify({ extra: true, ...snapshot })), null);
    for (let index = 0; index < entries.length; index++) {
      const missing = entries.filter((_, position) => position !== index);
      assert.equal(decodeSnapshot(JSON.stringify(Object.fromEntries(missing))), null);
      const replaced = Object.fromEntries([['extra', true], ...missing]);
      assert.equal(decodeSnapshot(JSON.stringify(replaced)), null);
    }
  }
});
