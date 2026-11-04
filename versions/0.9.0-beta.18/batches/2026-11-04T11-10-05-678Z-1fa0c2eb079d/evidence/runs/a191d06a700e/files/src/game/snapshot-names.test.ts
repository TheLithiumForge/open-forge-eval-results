import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame, isWon } from './game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';
import { replayGame } from './replay.ts';
import { isJsonObject } from './saved-format.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_VERSION,
} from './snapshot.ts';

const BASE = {
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: 'closed' },
  moves: 0,
  elapsedMs: 0,
  started: false,
};

test('named snapshots round trip exact names and clearing a name restores the version 1 format', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const progress = advanceGame(activateCard(createGame(EXAMPLE_CODE), 2), 123);
  for (const name of ['Café', '  Café 🙂  ', ' ', '🙂'.repeat(20), '\t\0\u2028\u2029', '\ud800']) {
    const state = renameGame(progress, name);
    const text = encodeSnapshot(state);
    const exported: unknown = JSON.parse(text);
    assert.ok(isJsonObject(exported));
    assert.equal(exported.version, 2);
    assert.equal(exported.name, name);
    assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS, 'name'].sort());
    assert.deepEqual(decodeSnapshot(text), state);
    const unnamed: unknown = JSON.parse(encodeSnapshot(renameGame(state, '')));
    assert.ok(isJsonObject(unnamed));
    assert.equal(unnamed.version, 1);
    assert.equal(Object.hasOwn(unnamed, 'name'), false);
  }
});

test('both snapshot versions require exactly their declared fields and supported versions', () => {
  const named = { ...BASE, version: 2, name: 'Café' };
  assert.equal(decodeSnapshot(JSON.stringify(named))?.name, 'Café');
  assert.equal(decodeSnapshot(JSON.stringify({ ...BASE, version: 1 }))?.name, '');
  for (const field of Object.keys(named)) {
    const missing = Object.fromEntries(Object.entries(named).filter(([key]) => key !== field));
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${field}`);
  }
  for (const version of [0, 3, -1, 1.5, '1', '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...BASE, version })), null);
  for (const value of [
    { ...BASE, version: 1, name: '' },
    { ...BASE, version: 1, name: 'Café' },
    { ...named, extra: true },
  ])
    assert.equal(decodeSnapshot(JSON.stringify(value)), null);
});

test('named imports reject empty, nonstring, overlong and multiline names', () => {
  for (const name of ['', 1, null, [], {}, 'x'.repeat(41), '🙂'.repeat(21), 'a\nb', 'a\rb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...BASE, version: 2, name })), null);
});

test('named progress keeps its name through turns, logical time and completion', () => {
  let state = renameGame(createGame(EXAMPLE_CODE), 'Finished deal');
  for (const [first, second] of EXAMPLE_PAIRS)
    state = activateCard(advanceGame(activateCard(state, first), 10), second);
  assert.equal(isWon(state), true);
  const restored = decodeSnapshot(encodeSnapshot(state));
  assert.ok(restored && isWon(restored));
  assert.equal(restored.name, 'Finished deal');
  assert.equal(restored.moves, 8);
  assert.equal(restored.elapsedMs, 80);
});

test('named snapshot limits count multibyte UTF-8 text rather than characters', () => {
  const text = JSON.stringify({ ...BASE, version: 2, name: 'é'.repeat(40) });
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.equal(Buffer.byteLength(padded, 'utf8'), 65_536);
  assert.equal(decodeSnapshot(padded)?.name, 'é'.repeat(40));
  assert.ok((padded + ' ').length < SNAPSHOT_MAX_BYTES);
  assert.equal(decodeSnapshot(padded + ' '), null);
});

test('version 1 replays continue emitting unnamed version 1 snapshots', () => {
  const state = replayGame(
    JSON.stringify({ version: 1, boardCode: EXAMPLE_CODE, actions: [], endMs: 0 }),
  );
  assert.ok(state);
  assert.equal(state.name, '');
  const exported: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(isJsonObject(exported));
  assert.equal(exported.version, SNAPSHOT_VERSION);
  assert.equal(Object.hasOwn(exported, 'name'), false);
});
