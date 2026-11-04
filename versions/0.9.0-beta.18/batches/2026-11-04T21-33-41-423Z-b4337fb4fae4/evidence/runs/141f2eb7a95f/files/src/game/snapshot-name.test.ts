import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';
import { isJsonObject } from './saved-format.ts';
import { SelectionKind } from './selection.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_VERSION,
} from './snapshot.ts';

test('named snapshots round trip regardless of field order', () => {
  const state = { ...createGame(EXAMPLE_CODE), name: ' Café ' };
  const encoded: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(isJsonObject(encoded));
  assert.equal(encoded.version, NAMED_SNAPSHOT_VERSION);
  assert.equal(encoded.name, state.name);
  assert.deepEqual(Object.keys(encoded), [...NAMED_SNAPSHOT_KEYS]);
  assert.deepEqual(decodeSnapshot(JSON.stringify(encoded)), state);

  const reversed = Object.fromEntries(Object.entries(encoded).reverse());
  assert.deepEqual(decodeSnapshot(JSON.stringify(reversed)), state);
  const unnamed = Object.fromEntries(
    Object.entries(JSON.parse(encodeSnapshot(createGame(EXAMPLE_CODE)))).reverse(),
  );
  assert.deepEqual(decodeSnapshot(JSON.stringify(unnamed)), createGame(EXAMPLE_CODE));
});

test('named snapshots reject empty, oversized and multiline names', () => {
  const valid = {
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Café',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
  assert.ok(decodeSnapshot(JSON.stringify(valid)));
  for (const name of ['', 'line\nbreak', 'line\rbreak', 'x'.repeat(41), '😀'.repeat(21)]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, name })), null, `reject ${name}`);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, extra: true })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, version: SNAPSHOT_VERSION })), null);
});
