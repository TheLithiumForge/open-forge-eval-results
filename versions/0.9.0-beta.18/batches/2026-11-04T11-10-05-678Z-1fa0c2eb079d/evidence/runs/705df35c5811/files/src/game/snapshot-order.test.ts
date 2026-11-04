import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('snapshot imports accept every property first and reordered nested selections', () => {
  const selections = [
    { kind: 'closed' },
    { index: 2, kind: 'one' },
    { remainingMs: 300, second: 1, first: 0, kind: 'mismatch' },
  ];
  for (const selection of selections)
    for (const version of [1, 2]) {
      const fields = Object.entries({
        version,
        ...(version === 2 ? { name: 'Café' } : {}),
        boardCode: EXAMPLE_CODE,
        matched: [],
        selection,
        moves: 1,
        elapsedMs: 1500,
        started: true,
      });
      const canonical = decodeSnapshot(JSON.stringify(Object.fromEntries(fields)));
      assert.ok(canonical);
      for (let first = 0; first < fields.length; first++) {
        const reordered = [...fields.slice(first), ...fields.slice(0, first)].reverse();
        const loaded = decodeSnapshot(JSON.stringify(Object.fromEntries(reordered)));
        assert.deepEqual(loaded, canonical);
        assert.equal(encodeSnapshot(loaded), encodeSnapshot(canonical));
      }
    }
});

test('reordered imports still reject unknown keys and missing required fields', () => {
  const valid = {
    started: false,
    elapsedMs: 0,
    moves: 0,
    selection: { kind: 'closed' },
    matched: [],
    boardCode: EXAMPLE_CODE,
    version: 1,
  };
  assert.ok(decodeSnapshot(JSON.stringify(valid)));
  for (const key of Object.keys(valid)) {
    const missing: Record<string, unknown> = { ...valid };
    delete missing[key];
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
  }
  for (const extra of [{ extra: true }, { name: '' }, { name: 'Café' }])
    assert.equal(decodeSnapshot(JSON.stringify({ ...extra, ...valid })), null);
});
