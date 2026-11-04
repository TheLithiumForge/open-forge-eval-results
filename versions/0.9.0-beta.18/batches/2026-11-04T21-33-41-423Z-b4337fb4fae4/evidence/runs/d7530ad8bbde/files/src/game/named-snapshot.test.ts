import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { isJsonObject } from './saved-format.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('named snapshots preserve names and accept reordered JSON fields', () => {
  const state = { ...createGame(EXAMPLE_CODE), name: ' Café ' };
  const exportedValue: unknown = JSON.parse(encodeSnapshot(state));
  if (!isJsonObject(exportedValue)) throw new Error('Expected a named snapshot object.');
  const exported = exportedValue;
  assert.equal(exported.version, NAMED_SNAPSHOT_VERSION);
  assert.equal(exported.name, ' Café ');
  assert.deepEqual(Object.keys(exported).sort(), [...NAMED_SNAPSHOT_KEYS].sort());
  const reordered = JSON.stringify(Object.fromEntries(Object.entries(exported).reverse()));
  assert.deepEqual(decodeSnapshot(reordered), state);

  const unnamedState = createGame(EXAMPLE_CODE);
  const unnamedValue: unknown = JSON.parse(encodeSnapshot(unnamedState));
  if (!isJsonObject(unnamedValue)) throw new Error('Expected an unnamed snapshot object.');
  const unnamed = unnamedValue;
  assert.equal(unnamed.version, SNAPSHOT_VERSION);
  assert.equal(Object.hasOwn(unnamed, 'name'), false);
  const reorderedUnnamed = JSON.stringify(Object.fromEntries(Object.entries(unnamed).reverse()));
  assert.deepEqual(decodeSnapshot(reorderedUnnamed), unnamedState);
});

test('named snapshots reject empty, overlong and multiline names', () => {
  for (const name of ['', 'x'.repeat(41), 'line\nbreak', 'line\rbreak']) {
    const value = {
      version: NAMED_SNAPSHOT_VERSION,
      name,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    };
    assert.equal(decodeSnapshot(JSON.stringify(value)), null);
  }
});
