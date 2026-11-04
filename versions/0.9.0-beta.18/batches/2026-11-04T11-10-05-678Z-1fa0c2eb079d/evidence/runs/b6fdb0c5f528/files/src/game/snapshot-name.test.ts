import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { renameGame } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

function namedSnapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 2,
    name: 'Café',
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  });
}

test('named snapshots round trip all progress states with their exact versioned fields', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const initial = renameGame(createGame(EXAMPLE_CODE), '  Café 🎮  ');
  const one = activateCard(initial, 0);
  const pending = advanceGame(activateCard(one, 1), 175);
  let completed = initial;
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) completed = activateCard(completed, index);
  for (const state of [initial, one, pending, completed]) {
    const text = encodeSnapshot(state);
    assert.ok(text.includes('\n  '), 'exports remain readable');
    assert.deepEqual(decodeSnapshot(text), {
      ...state,
      matched: [...state.matched].sort((left, right) => left - right),
    });
    const value: unknown = JSON.parse(text);
    assert.ok(isJsonObject(value));
    assert.deepEqual(Object.keys(value).sort(), [
      'boardCode',
      'elapsedMs',
      'matched',
      'moves',
      'name',
      'selection',
      'started',
      'version',
    ]);
    assert.equal(value.version, 2);
    assert.equal(value.name, initial.name);
  }
});

test('clearing a name exports the unchanged version one shape and imports unnamed', () => {
  const state = renameGame(renameGame(createGame(EXAMPLE_CODE), 'Café'), '');
  const text = encodeSnapshot(state);
  const value: unknown = JSON.parse(text);
  assert.deepEqual(value, {
    version: 1,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  assert.deepEqual(decodeSnapshot(text), state);
  assert.equal(decodeSnapshot(text)?.name, '');
});

test('named imports keep all allowed name characters and both length endpoints', () => {
  for (const name of [' ', '\t\u0000雪', 'x'.repeat(40), '🎮'.repeat(20)])
    assert.equal(decodeSnapshot(namedSnapshot({ name }))?.name, name);
});

test('both versions accept reordered outer and nested keys with version last', () => {
  const expectedOne = activateCard(createGame(EXAMPLE_CODE), 2);
  const one =
    '{"started":true,"selection":{"index":2,"kind":"one"},"matched":[],"elapsedMs":0,"moves":0,"boardCode":"np1-4-1","version":1}';
  assert.deepEqual(decodeSnapshot(one), expectedOne);
  const pending =
    '{"name":"Café","selection":{"remainingMs":300,"second":2,"first":1,"kind":"mismatch"},"matched":[11,0],"started":true,"elapsedMs":1500,"moves":2,"boardCode":"np1-4-1","version":2}';
  const restored = decodeSnapshot(pending);
  assert.ok(restored);
  assert.equal(restored.name, 'Café');
  assert.deepEqual(restored.matched, [11, 0]);
  assert.deepEqual(restored.selection, { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 });
  assert.equal(restored.moves, 2);
  assert.equal(restored.elapsedMs, 1500);
  for (const version of [1, 2]) {
    const full = {
      started: true,
      selection: { kind: 'closed' },
      elapsedMs: 1234,
      moves: 8,
      matched: EXAMPLE_PAIRS.flat(),
      boardCode: 'np1-4-1',
      ...(version === 2 ? { name: 'Finished' } : {}),
      version,
    };
    assert.deepEqual(decodeSnapshot(JSON.stringify(full))?.matched, EXAMPLE_PAIRS.flat());
  }
});

test('named imports reject invalid names, format versions and unknown or missing fields', () => {
  for (const name of ['', null, 1, {}, [], 'x'.repeat(41), '🎮'.repeat(21), 'A\rB', 'A\nB'])
    assert.equal(decodeSnapshot(namedSnapshot({ name })), null);
  for (const version of [0, 3, '2', null])
    assert.equal(decodeSnapshot(namedSnapshot({ version })), null);
  assert.equal(decodeSnapshot(namedSnapshot({ version: 1 })), null, 'v1 forbids a name');
  assert.equal(decodeSnapshot(namedSnapshot({ extra: true })), null);
  const full: unknown = JSON.parse(namedSnapshot());
  assert.ok(isJsonObject(full));
  for (const key of Object.keys(full)) {
    const missing: Record<string, unknown> = { ...full };
    delete missing[key];
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
  }
});

test('named imports apply the existing progress consistency checks', () => {
  for (const overrides of [
    { boardCode: 'np1-4-0' },
    { matched: [0] },
    { matched: [0, 1] },
    { matched: [2, 6, 2, 6] },
    { matched: [2, 6], moves: 0, started: true },
    { moves: 1 },
    { moves: 1_000_000 },
    { elapsedMs: 360_000_000 },
    { elapsedMs: 1.5 },
    { started: 'true' },
    { started: true },
    { started: true, selection: { kind: 'one', index: 16 } },
    { started: true, selection: { kind: 'one', index: 2, extra: true } },
    {
      started: true,
      moves: 1,
      selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 0 },
    },
    {
      started: true,
      moves: 1,
      selection: { kind: 'mismatch', first: 2, second: 6, remainingMs: 800 },
    },
  ])
    assert.equal(decodeSnapshot(namedSnapshot(overrides)), null);
});

test('named snapshots enforce their UTF-8 byte limit and round pending time correctly', () => {
  const text = namedSnapshot({ name: '雪🎮' });
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.equal(decodeSnapshot(padded)?.name, '雪🎮');
  assert.equal(decodeSnapshot(padded + ' '), null);
  assert.equal(decodeSnapshot(text + ' '.repeat(SNAPSHOT_MAX_BYTES - text.length)), null);
  const pending = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 799.75);
  const restored = decodeSnapshot(encodeSnapshot(renameGame(pending, 'Café')));
  assert.equal(restored?.elapsedMs, 799);
  assert.deepEqual(restored?.selection, { kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
});
