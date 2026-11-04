import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const SNAPSHOT = {
  version: 2,
  name: 'Café',
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: 'closed' },
  moves: 0,
  elapsedMs: 0,
  started: false,
};

test('named snapshots reject missing, invalid and unknown fields', () => {
  const invalid = [
    Object.fromEntries(Object.entries(SNAPSHOT).filter(([key]) => key !== 'name')),
    { ...SNAPSHOT, name: 17 },
    { ...SNAPSHOT, extra: true },
    { ...SNAPSHOT, version: 1, name: 'unexpected' },
  ];
  for (const value of invalid) assert.equal(decodeSnapshot(JSON.stringify(value)), null);
});

test('named snapshot size counts UTF-8 bytes at the exact limit', () => {
  const text = JSON.stringify(SNAPSHOT);
  const padding = ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(text + padding));
  assert.equal(decodeSnapshot(text + padding + ' '), null);
});
