import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame, isWon } from './game.ts';
import { renameGame } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS, SPEC_VECTOR } from './game.fixture.ts';

const NAME = 'Café';
const UNNAMED = {
  version: SNAPSHOT_VERSION,
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.one, index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};
const NAMED = { ...UNNAMED, version: NAMED_SNAPSHOT_VERSION, name: NAME };

function exportedKeys(text: string): string[] {
  const value: unknown = JSON.parse(text);
  assert.ok(value && typeof value === 'object');
  return Object.keys(value).sort();
}

test('the documented named snapshot restores its name and one revealed card', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, SPEC_VECTOR.namedSnapshotVersion);
  const example =
    '{"version":2,"name":"Café","boardCode":"np1-4-1","matched":[],' +
    '"selection":{"kind":"one","index":2},"moves":0,"elapsedMs":0,"started":true}';
  const state = decodeSnapshot(example);
  assert.equal(state?.name, NAME);
  assert.deepEqual(state?.selection, { kind: SelectionKind.one, index: 2 });
});

test('named games export version 2 and unnamed games export version 1', () => {
  const pending = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
  const named = renameGame(pending, NAME);
  const text = encodeSnapshot(named);
  assert.equal(JSON.parse(text).version, NAMED_SNAPSHOT_VERSION);
  assert.deepEqual(exportedKeys(text), [...NAMED_SNAPSHOT_KEYS].sort());
  assert.deepEqual(decodeSnapshot(text), named);
  const unnamed = encodeSnapshot(renameGame(named, ''));
  assert.equal(JSON.parse(unnamed).version, SNAPSHOT_VERSION);
  assert.deepEqual(exportedKeys(unnamed), [...SNAPSHOT_KEYS].sort());
  assert.deepEqual(decodeSnapshot(unnamed), pending);
});

test('names keep surrounding spaces and other characters through a round trip', () => {
  for (const name of [' padded ', '\u{1F0CF} tab\tname', 'x'.repeat(SPEC_VECTOR.dealNameLength)]) {
    const state = renameGame(createGame(EXAMPLE_CODE), name);
    assert.equal(state.name, name);
    assert.equal(decodeSnapshot(encodeSnapshot(state))?.name, name);
  }
});

test('a version 1 import is unnamed and a completed named import stays completed', () => {
  assert.equal(decodeSnapshot(JSON.stringify(UNNAMED))?.name, '');
  const completed = {
    ...NAMED,
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: SelectionKind.closed },
    moves: EXAMPLE_PAIRS.length,
  };
  const state = decodeSnapshot(JSON.stringify(completed));
  assert.ok(state && isWon(state));
  assert.equal(state.name, NAME);
});

test('pasted snapshots load whatever order their keys use', () => {
  for (const source of [UNNAMED, NAMED]) {
    const reversed = Object.fromEntries(Object.entries(source).reverse());
    assert.notEqual(Object.keys(reversed)[0], 'version');
    assert.ok(decodeSnapshot(JSON.stringify(reversed)), `version ${source.version} reversed`);
    const indented = JSON.stringify(reversed, null, '\t').replaceAll('\n', '\r\n');
    assert.ok(decodeSnapshot(`\r\n ${indented} \r\n`), `version ${source.version} with CRLF`);
  }
});

const INVALID_NAMED: readonly Record<string, unknown>[] = [
  { name: '' },
  { name: 'x'.repeat(SPEC_VECTOR.dealNameLength + 1) },
  { name: 'line\nbreak' },
  { name: 'carriage\rreturn' },
  { name: 7 },
  { name: null },
  { version: SNAPSHOT_VERSION },
  { version: 3 },
  { version: '2' },
  { extra: true },
];
for (const [index, overrides] of INVALID_NAMED.entries()) {
  test(`named snapshot validation rejects case ${index + 1}`, () => {
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...overrides })), null);
  });
}

test('a version 2 snapshot needs a name and version 1 rejects one', () => {
  const { name: _name, ...missing } = NAMED;
  assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, name: NAME })), null);
});
