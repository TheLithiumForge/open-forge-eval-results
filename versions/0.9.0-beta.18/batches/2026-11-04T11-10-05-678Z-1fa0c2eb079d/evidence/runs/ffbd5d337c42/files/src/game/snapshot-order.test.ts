import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

// Literal saved progress deliberately uses a different order from the exporter.
const SAVED = {
  elapsedMs: 1500,
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  started: true,
  matched: [0, 11],
  boardCode: EXAMPLE_CODE,
  moves: 2,
  version: 1,
};

test('snapshot fields and selection fields can appear in different key orders', () => {
  const entries = Object.entries(SAVED);
  for (let offset = 0; offset < entries.length; offset++) {
    const reordered = Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]);
    const state = decodeSnapshot(JSON.stringify(reordered));
    assert.ok(state);
    assert.equal(state.boardCode, EXAMPLE_CODE);
    assert.deepEqual(state.matched, [0, 11]);
    assert.deepEqual(state.selection, {
      kind: 'mismatch',
      first: 1,
      second: 2,
      remainingMs: 300,
    });
    assert.equal(state.moves, 2);
    assert.equal(state.elapsedMs, 1500);
    assert.equal(state.started, true);
  }
});

test('reordered snapshots still reject every missing field and unknown field', () => {
  for (const field of Object.keys(SAVED)) {
    const missing = Object.fromEntries(Object.entries(SAVED).filter(([key]) => key !== field));
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${field}`);
    assert.equal(
      decodeSnapshot(JSON.stringify({ ...missing, unknown: true })),
      null,
      `unknown field in place of ${field}`,
    );
  }
  assert.equal(decodeSnapshot(JSON.stringify({ extra: true, ...SAVED })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...SAVED, extra: true })), null);
});
