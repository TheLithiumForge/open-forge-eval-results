import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import { decodeSnapshot } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const PROGRESS = {
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { index: 2, kind: 'one' },
  moves: 0,
  elapsedMs: 0,
  started: true,
  version: 1,
};

test('pasted snapshots accept every field first or last and selection fields in reverse order', () => {
  const entries = Object.entries(PROGRESS);
  const expected = activateCard(createGame(EXAMPLE_CODE), 2);
  for (let offset = 0; offset < entries.length; offset++) {
    const rotated = [...entries.slice(offset), ...entries.slice(0, offset)];
    for (const fields of [rotated, [...rotated].reverse()])
      assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(fields))), expected);
  }
});

test('reordered snapshots still reject missing, substituted and unknown fields', () => {
  const entries = Object.entries(PROGRESS);
  for (const [key] of entries) {
    const without = Object.fromEntries(entries.filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify(without)), null);
    assert.equal(decodeSnapshot(JSON.stringify({ ...without, extra: true })), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...PROGRESS, extra: true })), null);
});
