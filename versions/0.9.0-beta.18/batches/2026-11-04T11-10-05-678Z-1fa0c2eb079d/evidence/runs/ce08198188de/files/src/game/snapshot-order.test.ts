import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

test('external snapshots accept every position of the version key and reordered selection keys', () => {
  for (const version of [1, 2]) {
    const snapshot = {
      boardCode: 'np1-4-1',
      matched: [0, 11],
      selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
      moves: 2,
      elapsedMs: 1500,
      started: true,
      ...(version === 2 ? { name: 'Café' } : {}),
    };
    const fields = Object.entries(snapshot);
    for (let position = 0; position <= fields.length; position++) {
      const entries = [
        ...fields.slice(0, position),
        ['version', version],
        ...fields.slice(position),
      ];
      const restored = decodeSnapshot(JSON.stringify(Object.fromEntries(entries)));
      assert.ok(restored, `version ${version} key at ${position}`);
      assert.equal(restored.name, version === 2 ? 'Café' : '');
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
  }
});

test('reordered snapshot keys still require exactly the declared fields', () => {
  const snapshot = {
    boardCode: 'np1-4-1',
    matched: [],
    selection: { index: 2, kind: 'one' },
    moves: 0,
    elapsedMs: 0,
    started: true,
    version: 1,
  };
  assert.ok(decodeSnapshot(JSON.stringify(snapshot)));
  for (const key of Object.keys(snapshot)) {
    const incomplete = Object.fromEntries(
      Object.entries(snapshot).filter(([field]) => field !== key),
    );
    assert.equal(decodeSnapshot(JSON.stringify(incomplete)), null, `missing ${key}`);
  }
  for (const extra of [{ extra: true }, { name: '' }, { version: 2 }, { version: 3 }])
    assert.equal(decodeSnapshot(JSON.stringify({ ...snapshot, ...extra })), null);
});
