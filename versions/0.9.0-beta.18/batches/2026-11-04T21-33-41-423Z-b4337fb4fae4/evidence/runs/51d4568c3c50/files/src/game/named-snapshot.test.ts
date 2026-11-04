import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';
import { SelectionKind } from './selection.ts';
import { isJsonObject } from './saved-format.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
} from './snapshot.ts';

test('named snapshots round trip their name and accept reordered top-level keys', () => {
  const game = activateCard(createGame(EXAMPLE_CODE), 2);
  const name = ' Café ';
  const encoded = encodeSnapshot(game, name);
  const value: unknown = JSON.parse(encoded);
  assert.ok(isJsonObject(value));
  assert.deepEqual(Object.keys(value), [...NAMED_SNAPSHOT_KEYS]);
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  assert.deepEqual(decodeSnapshot(encoded), { game, name });

  const reordered = JSON.stringify({
    started: true,
    elapsedMs: 0,
    selection: { kind: SelectionKind.one, index: 2 },
    moves: 0,
    boardCode: EXAMPLE_CODE,
    name,
    version: 2,
    matched: [],
  });
  assert.deepEqual(decodeSnapshot(reordered), { game, name });
});

test('named snapshots reject empty, oversized and newline names', () => {
  const fields = {
    version: 1,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.one, index: 0 },
    moves: 0,
    elapsedMs: 0,
    started: true,
  };
  for (const name of ['', 'x'.repeat(41), 'line\nbreak', 'line\rbreak']) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...fields, version: 2, name })), null);
  }
});
