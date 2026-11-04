import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

const SNAPSHOT = {
  version: 1,
  boardCode: 'np1-4-1',
  matched: [11, 0],
  selection: { remainingMs: 300, second: 2, kind: 'mismatch', first: 1 },
  moves: 2,
  elapsedMs: 1500,
  started: true,
};

test('snapshot fields and selection fields load in every field position', () => {
  const entries = Object.entries(SNAPSHOT);
  const expected = decodeSnapshot(JSON.stringify(SNAPSHOT));
  assert.ok(expected);
  for (let position = 0; position < entries.length; position++) {
    const reordered = Object.fromEntries([
      ...entries.slice(position),
      ...entries.slice(0, position),
    ]);
    assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), expected);
  }
  assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(entries.reverse()))), expected);
});

test('reordering cannot hide missing, unknown or inconsistent snapshot fields', () => {
  for (const field of Object.keys(SNAPSHOT)) {
    const missing = Object.fromEntries(Object.entries(SNAPSHOT).filter(([key]) => key !== field));
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${field}`);
    assert.equal(decodeSnapshot(JSON.stringify({ ...missing, unexpected: true })), null, field);
  }
  const reversed = Object.fromEntries(Object.entries(SNAPSHOT).reverse());
  for (const overrides of [
    { extra: true },
    { moves: 1 },
    { elapsedMs: 360_000_000 },
    { matched: [11, 11] },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'closed', extra: true } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...reversed, ...overrides })), null);
});
