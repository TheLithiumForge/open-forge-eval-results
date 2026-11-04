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

test('pasted snapshots accept every top-level property first and reordered selection fields', () => {
  const entries = Object.entries(PROGRESS);
  for (const [first, value] of entries) {
    const text = JSON.stringify({ [first]: value, ...PROGRESS });
    const restored = decodeSnapshot(text);
    assert.ok(restored, `${first} can precede version`);
    assert.deepEqual(restored.matched, [0, 11]);
    assert.deepEqual(restored.selection, {
      kind: 'mismatch',
      first: 1,
      second: 2,
      remainingMs: 300,
    });
    assert.equal(restored.moves, 2);
    assert.equal(restored.elapsedMs, 1500);
  }
});

test('reordering cannot hide unknown or missing snapshot properties', () => {
  for (const key of Object.keys(PROGRESS)) {
    const missing = Object.fromEntries(Object.entries(PROGRESS).filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
  }
  for (const extra of ['extra', 'name', '__proto__']) {
    assert.equal(decodeSnapshot(JSON.stringify({ [extra]: 'unexpected', ...PROGRESS })), null);
    assert.equal(decodeSnapshot(JSON.stringify({ ...PROGRESS, [extra]: 'unexpected' })), null);
  }
});
