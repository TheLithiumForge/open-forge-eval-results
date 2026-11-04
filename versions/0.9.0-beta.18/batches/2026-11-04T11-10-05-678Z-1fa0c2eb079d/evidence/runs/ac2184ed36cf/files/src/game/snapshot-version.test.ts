import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

function namedSnapshot(name: string, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: NAMED_SNAPSHOT_VERSION,
    name,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  });
}

test('named progress exports and restores version 2 while unnamed progress stays version 1', () => {
  const unnamed = createGame(EXAMPLE_CODE);
  const unnamedJson: unknown = JSON.parse(encodeSnapshot(unnamed));
  assert.ok(unnamedJson && typeof unnamedJson === 'object');
  assert.equal(Reflect.get(unnamedJson, 'version'), SNAPSHOT_VERSION);
  assert.deepEqual(Object.keys(unnamedJson).sort(), [...SNAPSHOT_KEYS].sort());

  const named = { ...activateCard(unnamed, 0), name: '  Café 🎴  ' };
  const encoded = encodeSnapshot(named);
  const namedJson: unknown = JSON.parse(encoded);
  assert.ok(namedJson && typeof namedJson === 'object');
  assert.equal(Reflect.get(namedJson, 'version'), NAMED_SNAPSHOT_VERSION);
  assert.equal(Reflect.get(namedJson, 'name'), named.name);
  assert.deepEqual(Object.keys(namedJson).sort(), [...SNAPSHOT_KEYS, 'name'].sort());
  assert.deepEqual(decodeSnapshot(encoded), named);
});

test('snapshot import accepts valid keys regardless of property order', () => {
  const unnamed = decodeSnapshot(
    JSON.stringify({
      started: false,
      elapsedMs: 0,
      selection: { kind: SelectionKind.closed },
      matched: [],
      boardCode: EXAMPLE_CODE,
      moves: 0,
      version: SNAPSHOT_VERSION,
    }),
  );
  assert.ok(unnamed, 'D05 version 1 fields have no required JSON order');
  assert.equal(unnamed.name, '', 'version 1 import clears the name');
  assert.equal(
    decodeSnapshot(
      JSON.stringify({
        name: 'Café',
        started: false,
        elapsedMs: 0,
        moves: 0,
        boardCode: EXAMPLE_CODE,
        selection: { kind: SelectionKind.closed },
        version: NAMED_SNAPSHOT_VERSION,
        matched: [],
      }),
    )?.name,
    'Café',
    'D05 version 2 fields have no required JSON order',
  );
});

test('version 2 rejects missing, empty, invalid and extra name fields', () => {
  assert.equal(decodeSnapshot(namedSnapshot('')), null, 'named snapshot needs a name');
  assert.equal(decodeSnapshot(namedSnapshot('a'.repeat(41))), null, 'name exceeds 40 code units');
  assert.equal(decodeSnapshot(namedSnapshot('line\nbreak')), null, 'name cannot contain LF');
  assert.equal(decodeSnapshot(namedSnapshot('carriage\rreturn')), null, 'name cannot contain CR');
  assert.equal(decodeSnapshot(namedSnapshot('valid', { extra: true })), null, 'unknown key');
  assert.equal(
    decodeSnapshot(
      JSON.stringify({
        version: NAMED_SNAPSHOT_VERSION,
        boardCode: EXAMPLE_CODE,
        matched: [],
        selection: { kind: SelectionKind.closed },
        moves: 0,
        elapsedMs: 0,
        started: false,
      }),
    ),
    null,
    'version 2 requires its name field',
  );
});
