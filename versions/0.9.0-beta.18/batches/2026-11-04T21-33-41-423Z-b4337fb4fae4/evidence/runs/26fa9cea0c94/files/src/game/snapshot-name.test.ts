import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import { isJsonObject } from './saved-format.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  isValidDealName,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('unnamed progress keeps version one and named progress round trips in version two', () => {
  const unnamed = encodeSnapshot(createGame(EXAMPLE_CODE));
  const unnamedSaved: unknown = JSON.parse(unnamed);
  assert.ok(isJsonObject(unnamedSaved));
  assert.equal(unnamedSaved.version, SNAPSHOT_VERSION);

  const game = { ...activateCard(createGame(EXAMPLE_CODE), 0), name: '  Café 🙂  ' };
  const encoded = encodeSnapshot(game);
  const saved: unknown = JSON.parse(encoded);
  assert.ok(isJsonObject(saved));
  assert.equal(saved.version, NAMED_SNAPSHOT_VERSION);
  assert.equal(saved.name, game.name);
  assert.deepEqual(decodeSnapshot(encoded), game);
});

test('pasted snapshots accept exact fields in arbitrary property order', () => {
  const unnamed = JSON.stringify({
    started: false,
    selection: { kind: SelectionKind.closed },
    elapsedMs: 0,
    moves: 0,
    matched: [],
    boardCode: EXAMPLE_CODE,
    version: SNAPSHOT_VERSION,
  });
  assert.ok(decodeSnapshot(unnamed));

  const named = JSON.stringify({
    started: true,
    selection: { kind: SelectionKind.one, index: 0 },
    elapsedMs: 0,
    moves: 0,
    matched: [],
    boardCode: EXAMPLE_CODE,
    name: 'Café',
    version: NAMED_SNAPSHOT_VERSION,
  });
  assert.equal(decodeSnapshot(named)?.name, 'Café');
});

test('version two requires a valid name and version one rejects extra name fields', () => {
  const base = {
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
  for (const name of ['', 'x'.repeat(41), 'line\nbreak', 'line\rbreak']) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...base, version: 2, name })), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...base, version: 1, name: 'extra' })), null);
  assert.equal(isValidDealName('😀'.repeat(20)), true);
  assert.equal(isValidDealName('😀'.repeat(21)), false);
});
