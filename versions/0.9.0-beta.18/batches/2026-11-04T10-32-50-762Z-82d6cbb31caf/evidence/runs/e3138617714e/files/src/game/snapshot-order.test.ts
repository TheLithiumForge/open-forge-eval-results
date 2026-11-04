import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('pasted snapshots accept every field first and reordered selection fields', () => {
  const state = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
  const fields = [
    ['version', 1],
    ['boardCode', EXAMPLE_CODE],
    ['matched', []],
    ['selection', { remainingMs: 625, second: 1, first: 0, kind: 'mismatch' }],
    ['moves', 1],
    ['elapsedMs', 175],
    ['started', true],
  ] as const;
  for (let first = 0; first < fields.length; first += 1) {
    const reordered = Object.fromEntries([...fields.slice(first), ...fields.slice(0, first)]);
    const text = JSON.stringify(reordered, null, 2);
    assert.deepEqual(decodeSnapshot(text), state, `first field ${fields[first]?.[0]}`);
    const decoded = decodeSnapshot(text);
    assert.ok(decoded);
    assert.equal(encodeSnapshot(decoded), encodeSnapshot(state));
  }
});

test('reordered snapshots still reject missing, unknown and unsupported fields', () => {
  const fields = {
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: 1,
  };
  assert.ok(decodeSnapshot(JSON.stringify(fields)));
  for (const key of Object.keys(fields)) {
    const missing = Object.fromEntries(Object.entries(fields).filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
    assert.equal(decodeSnapshot(JSON.stringify({ ...missing, unknown: true })), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...fields, unknown: true })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...fields, version: 2 })), null);
});
