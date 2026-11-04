import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, GAME_NAME_MAX_CHARACTERS } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_KEYS, SNAPSHOT_VERSION } from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

function snapshot(overrides: object = {}): string {
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  });
}

test('unnamed exports retain the original snapshot keys and load as unnamed', () => {
  const text = encodeSnapshot(createGame(EXAMPLE_CODE));
  assert.deepEqual(Object.keys(JSON.parse(text)).sort(), [...SNAPSHOT_KEYS].sort());
  assert.equal(decodeSnapshot(text)?.name, '');
});

test('named snapshots preserve Unicode, spaces and property order', () => {
  const name = '  Musée 🪩  ';
  const game = { ...createGame(EXAMPLE_CODE), name };
  const exported = encodeSnapshot(game);
  assert.equal(decodeSnapshot(exported)?.name, name);
  const fields: unknown = JSON.parse(exported);
  assert.ok(fields && typeof fields === 'object' && !Array.isArray(fields));
  assert.equal(
    decodeSnapshot(JSON.stringify(Object.fromEntries(Object.entries(fields).reverse())))?.name,
    name,
  );
  assert.equal(decodeSnapshot(snapshot({ name: '' }))?.name, '');
});

test('snapshot names reject unsupported types, lengths and extra fields', () => {
  for (const name of [null, 4, {}, 'x'.repeat(GAME_NAME_MAX_CHARACTERS + 1)])
    assert.equal(decodeSnapshot(snapshot({ name })), null);
  assert.equal(decodeSnapshot(snapshot({ name: 'a', extra: true })), null);
});
