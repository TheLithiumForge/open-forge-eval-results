import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame, GAME_NAME_MAX_CHARACTERS } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

const NAME = 'Café "Neon" 🃏';

test('a named game keeps its name through play and snapshot round trips', () => {
  const initial = createGame(EXAMPLE_CODE, NAME);
  const first = activateCard(initial, 0);
  const pending = advanceGame(activateCard(first, 1), 175);
  const closed = advanceGame(pending, 625);
  const matched = activateCard(activateCard(closed, 2), 6);
  for (const state of [initial, first, pending, closed, matched]) {
    assert.equal(state.name, NAME);
    assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  }
  let completed = initial;
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) completed = activateCard(completed, index);
  assert.equal(decodeSnapshot(encodeSnapshot(completed))?.name, NAME);
});

test('named snapshots accept the name and version in every field position', () => {
  const state = createGame(EXAMPLE_CODE, NAME);
  const fields = Object.entries({
    name: NAME,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: 1,
  });
  for (let first = 0; first < fields.length; first += 1) {
    const reordered = Object.fromEntries([...fields.slice(first), ...fields.slice(0, first)]);
    assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), state);
  }
});

test('unnamed exports keep the original format and legacy snapshots load with an empty name', () => {
  const legacy = {
    version: 1,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
  assert.deepEqual(JSON.parse(encodeSnapshot(createGame(EXAMPLE_CODE))), legacy);
  assert.equal(decodeSnapshot(JSON.stringify(legacy))?.name, '');
  assert.deepEqual(
    decodeSnapshot(JSON.stringify({ ...legacy, name: '' })),
    createGame(EXAMPLE_CODE),
  );
  for (const name of [null, false, 123, [], {}, 'a'.repeat(GAME_NAME_MAX_CHARACTERS + 1)])
    assert.equal(decodeSnapshot(JSON.stringify({ ...legacy, name })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...legacy, name: NAME, extra: true })), null);
  for (const key of Object.keys(legacy)) {
    const missing = Object.fromEntries(Object.entries(legacy).filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify({ ...missing, name: NAME })), null);
  }
});

test('named snapshots keep the character limit and count their UTF-8 bytes', () => {
  const state = createGame(EXAMPLE_CODE, 'é'.repeat(GAME_NAME_MAX_CHARACTERS));
  const text = encodeSnapshot(state);
  assert.deepEqual(decodeSnapshot(text), state);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.deepEqual(decodeSnapshot(padded), state);
  assert.equal(decodeSnapshot(padded + ' '), null);
});
