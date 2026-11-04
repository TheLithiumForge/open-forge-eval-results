import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame, isWon } from './game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';

const NAMED = {
  version: 2,
  name: 'Café',
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('the documented named snapshot restores its name and first revealed card', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  assert.deepEqual(
    decodeSnapshot(JSON.stringify(NAMED)),
    renameGame(activateCard(createGame(EXAMPLE_CODE), 2), 'Café'),
  );
});

test('named snapshots round trip fresh, pending and completed progress with exact fields', () => {
  let complete = createGame(EXAMPLE_CODE);
  for (const [first, second] of EXAMPLE_PAIRS)
    complete = activateCard(activateCard(complete, first), second);
  assert.ok(isWon(complete));
  const pending = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
  for (const state of [createGame(EXAMPLE_CODE), pending, complete]) {
    const named = renameGame(state, ' Café 😀 ');
    const text = encodeSnapshot(named);
    const exported: unknown = JSON.parse(text);
    assert.ok(isJsonObject(exported));
    assert.equal(exported.version, 2);
    assert.equal(exported.name, ' Café 😀 ');
    assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS, 'name'].sort());
    const restored = decodeSnapshot(text);
    assert.ok(restored);
    assert.deepEqual(restored, { ...named, matched: [...named.matched].sort((a, b) => a - b) });
    const unnamed: unknown = JSON.parse(encodeSnapshot(renameGame(restored, '')));
    assert.ok(isJsonObject(unnamed));
    assert.equal(unnamed.version, 1);
    assert.equal(Object.hasOwn(unnamed, 'name'), false);
  }
});

test('version two accepts names by UTF-16 length without trimming other characters', () => {
  for (const name of [' ', '\t', '\u0000', 'é'.repeat(40), '😀'.repeat(20), ' Café '])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name }))?.name, name);
  for (const name of ['', null, true, 17, [], {}, 'a'.repeat(41), '😀'.repeat(21), 'a\nb', 'a\rb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
});

test('each snapshot version requires its exact fields and a supported numeric version', () => {
  const { name: _name, ...unnamed } = NAMED;
  assert.equal(decodeSnapshot(JSON.stringify({ ...unnamed, version: 1 }))?.name, '');
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version: 1 })), null);
  assert.equal(decodeSnapshot(JSON.stringify(unnamed)), null);
  for (const version of [0, 3, '2', null, 1.5])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, extra: true })), null);
  for (const key of Object.keys(NAMED)) {
    const missing = Object.fromEntries(Object.entries(NAMED).filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, key);
  }
});

test('named JSON enforces the exact UTF-8 byte boundary including Unicode names', () => {
  const text = JSON.stringify({ ...NAMED, name: '😀'.repeat(20) });
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.ok(padded.length < SNAPSHOT_MAX_BYTES);
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
  assert.equal(decodeSnapshot(text.slice(0, -1)), null);
});
