import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, activateCard, advanceGame } from './game.ts';
import { renameGame } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

const NAMED = {
  name: '  Café 😀  ',
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
  version: 2,
};

test('named progress exports version two and imports independently of field order', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const state = renameGame(activateCard(createGame(EXAMPLE_CODE), 2), NAMED.name);
  assert.deepEqual(JSON.parse(encodeSnapshot(state)), NAMED);
  const entries = Object.entries(NAMED);
  for (let offset = 0; offset < entries.length; offset++) {
    const reordered = Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]);
    assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), state);
  }
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
});

test('unnamed exports and imports retain the version one schema without a name field', () => {
  const named = renameGame(activateCard(createGame(EXAMPLE_CODE), 2), NAMED.name);
  const unnamed = renameGame(named, '');
  const { name, ...legacy } = NAMED;
  assert.equal(name, named.name);
  assert.deepEqual(JSON.parse(encodeSnapshot(unnamed)), { ...legacy, version: 1 });
  assert.deepEqual(decodeSnapshot(JSON.stringify({ ...legacy, version: 1 })), unnamed);
});

test('named snapshots require their exact fields and a nonempty valid name', () => {
  for (const name of ['', null, 42, {}, 'a'.repeat(41), '😀'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
  for (const name of [' ', 'a'.repeat(40), '😀'.repeat(20), '\t\u2028\u2029'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name }))?.name, name);
  for (const field of Object.keys(NAMED)) {
    const missing = Object.fromEntries(Object.entries(NAMED).filter(([key]) => key !== field));
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${field}`);
    assert.equal(decodeSnapshot(JSON.stringify({ ...missing, extra: true })), null);
  }
  for (const version of [0, 1, 3, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, extra: true })), null);
});

test('named snapshots enforce progress validation and the UTF-8 byte limit', () => {
  for (const invalid of [
    { matched: [0] },
    { moves: -1 },
    { moves: 1_000_000 },
    { elapsedMs: 360_000_000 },
    { started: false },
    { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'closed', extra: true } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...invalid })), null);
  const text = JSON.stringify(NAMED);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});

test('names survive pending mismatch rounding, completion and subsequent play', () => {
  const initial = renameGame(createGame(EXAMPLE_CODE), NAMED.name);
  const pending = advanceGame(activateCard(activateCard(initial, 0), 1), 799.75);
  const restored = decodeSnapshot(encodeSnapshot(pending));
  assert.equal(restored?.name, NAMED.name);
  assert.deepEqual(restored?.selection, { kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  assert.equal(advanceGame(pending, 1).name, NAMED.name);
  const completed = EXAMPLE_PAIRS.flat().reduce(activateCard, initial);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(completed)), {
    ...completed,
    matched: Array.from({ length: 16 }, (_, index) => index),
  });
});
