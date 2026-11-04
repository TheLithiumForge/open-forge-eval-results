import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, nameGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { SelectionKind } from './selection.ts';

function namedSnapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Café',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  });
}

test('unnamed and named snapshots use their declared versions and exact fields', () => {
  const unnamed = encodeSnapshot(createGame(EXAMPLE_CODE));
  const named = encodeSnapshot(nameGame(createGame(EXAMPLE_CODE), '  Café  '));
  const unnamedValue: unknown = JSON.parse(unnamed);
  const namedValue: unknown = JSON.parse(named);
  assert.ok(unnamedValue && typeof unnamedValue === 'object');
  assert.ok(namedValue && typeof namedValue === 'object');
  assert.equal(SNAPSHOT_VERSION, 1);
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  assert.deepEqual(Object.keys(unnamedValue).sort(), [...SNAPSHOT_KEYS].sort());
  assert.deepEqual(Object.keys(namedValue).sort(), [...NAMED_SNAPSHOT_KEYS].sort());
  assert.deepEqual(decodeSnapshot(unnamed), createGame(EXAMPLE_CODE));
  assert.deepEqual(decodeSnapshot(named), nameGame(createGame(EXAMPLE_CODE), '  Café  '));
});

test('version 2 accepts reordered properties and restores the exact name', () => {
  const text =
    '{"started":true,"selection":{"index":2,"kind":"one"},"name":" Café ",' +
    '"version":2,"elapsedMs":0,"moves":0,"matched":[],"boardCode":"np1-4-1"}';
  const game = decodeSnapshot(text);
  assert.ok(game);
  assert.equal(game.name, ' Café ');
  assert.deepEqual(game.selection, { kind: SelectionKind.one, index: 2 });
});

test('version 2 rejects invalid names and fields while version 1 stays unnamed', () => {
  for (const name of ['', 'x'.repeat(41), 'x\ry', 'x\ny', 5])
    assert.equal(decodeSnapshot(namedSnapshot({ name })), null);
  assert.equal(decodeSnapshot(namedSnapshot({ extra: true })), null);
  const legacy = JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  assert.equal(decodeSnapshot(legacy)?.name, '');
  assert.equal(decodeSnapshot(namedSnapshot({ version: 3 })), null);
  assert.equal(decodeSnapshot(namedSnapshot({ name: undefined })), null);
  assert.equal(
    decodeSnapshot(
      JSON.stringify({
        version: SNAPSHOT_VERSION,
        name: 'Café',
        boardCode: EXAMPLE_CODE,
        matched: [],
        selection: { kind: SelectionKind.closed },
        moves: 0,
        elapsedMs: 0,
        started: false,
      }),
    ),
    null,
  );
});
