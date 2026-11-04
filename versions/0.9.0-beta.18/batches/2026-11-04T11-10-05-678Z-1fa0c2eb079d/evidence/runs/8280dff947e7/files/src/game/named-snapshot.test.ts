import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';
import { replayGame } from './replay.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

const BASE = {
  version: 2,
  name: 'Café',
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('the documented named snapshot restores progress and preserves its exact name', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  for (const name of ['Café', ' Café ', ' ', '😀'.repeat(20), 'x'.repeat(40)]) {
    const state = decodeSnapshot(JSON.stringify({ ...BASE, name }));
    assert.ok(state);
    assert.equal(state.name, name);
    assert.deepEqual(state.selection, { kind: 'one', index: 2 });
    assert.equal(state.moves, 0);
    assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  }
});

test('named exports have exactly the version two fields and preserve pending whole time', () => {
  const started = { ...createGame(EXAMPLE_CODE), name: ' Café ' };
  const mismatch = advanceGame(activateCard(activateCard(started, 0), 1), 799.75);
  const exported: unknown = JSON.parse(encodeSnapshot(mismatch));
  assert.ok(isJsonObject(exported));
  assert.deepEqual(Object.keys(exported).sort(), [
    'boardCode',
    'elapsedMs',
    'matched',
    'moves',
    'name',
    'selection',
    'started',
    'version',
  ]);
  assert.equal(exported.version, 2);
  assert.equal(exported.name, started.name);
  assert.equal(exported.elapsedMs, 799);
  assert.deepEqual(exported.selection, {
    kind: 'mismatch',
    first: 0,
    second: 1,
    remainingMs: 1,
  });
  assert.equal(mismatch.elapsedMs, 799.75);
});

test('unnamed games and replay output keep the exact version one format without a name', () => {
  const replay = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[],"endMs":0}');
  assert.ok(replay);
  for (const state of [createGame(EXAMPLE_CODE), replay]) {
    const exported: unknown = JSON.parse(encodeSnapshot(state));
    assert.ok(isJsonObject(exported));
    assert.equal(exported.version, 1);
    assert.equal(Object.hasOwn(exported, 'name'), false);
    assert.equal(decodeSnapshot(JSON.stringify(exported))?.name, '');
  }
});

test('snapshot versions require their exact name field and reject invalid names', () => {
  for (const name of ['', null, 0, {}, [], 'x'.repeat(41), '😀'.repeat(20) + 'x', '\r', '\n'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...BASE, name })), null);
  const { name, ...unnamed } = BASE;
  assert.equal(name, 'Café');
  assert.equal(decodeSnapshot(JSON.stringify(unnamed)), null, 'version two requires a name');
  assert.equal(decodeSnapshot(JSON.stringify({ ...BASE, version: 1 })), null);
  for (const version of [0, 3, -1, 1.5, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...BASE, version })), null);
});

test('named snapshots keep completion and state validation and the UTF-8 byte limit', () => {
  const complete = {
    ...BASE,
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 1000,
  };
  const state = decodeSnapshot(JSON.stringify(complete));
  assert.ok(state);
  assert.equal(state.name, BASE.name);
  assert.equal(state.matched.length, 16);
  for (const invalid of [
    { ...complete, moves: 7 },
    { ...complete, selection: { kind: 'one', index: 2 } },
    { ...BASE, elapsedMs: 359_999_999 + 1 },
    { ...BASE, moves: 999_999 + 1 },
    { ...BASE, started: false },
    { ...BASE, extra: true },
  ])
    assert.equal(decodeSnapshot(JSON.stringify(invalid)), null);
  const text = JSON.stringify(BASE);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
