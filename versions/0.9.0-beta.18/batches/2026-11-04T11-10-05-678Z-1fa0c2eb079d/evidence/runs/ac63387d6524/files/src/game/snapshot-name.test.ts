import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame, GAME_NAME_MAX_CHARACTERS } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_KEYS, SNAPSHOT_MAX_BYTES } from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

function fields(name?: unknown): Record<string, unknown> {
  const value: unknown = JSON.parse(encodeSnapshot(createGame(EXAMPLE_CODE)));
  assert.ok(isJsonObject(value));
  return name === undefined ? value : { ...value, name };
}

test('named progress preserves literal text and pending time through unordered snapshots', () => {
  const name = '  Friday "pairs" — 星🌙 <b>play</b>  ';
  const state = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE, name), 0), 1), 175);
  const text = encodeSnapshot(state);
  assert.deepEqual(decodeSnapshot(text), state);
  const value: unknown = JSON.parse(text);
  assert.ok(isJsonObject(value));
  assert.equal(value.name, name);
  const reordered = Object.fromEntries(Object.entries(value).reverse());
  assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), state);
});

test('unnamed exports keep the legacy fields and legacy imports receive an empty name', () => {
  const state = createGame(EXAMPLE_CODE);
  assert.equal(state.name, '');
  const value = fields();
  assert.deepEqual(Object.keys(value), SNAPSHOT_KEYS);
  assert.deepEqual(decodeSnapshot(JSON.stringify(value)), state);
  assert.deepEqual(decodeSnapshot(JSON.stringify(fields(''))), state);
});

test('names survive matching, elapsed time and completed snapshot loads', () => {
  let state = createGame(EXAMPLE_CODE, 'Weekend puzzle');
  for (const [first, second] of EXAMPLE_PAIRS)
    state = activateCard(advanceGame(activateCard(state, first), 10), second);
  assert.equal(state.name, 'Weekend puzzle');
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), {
    ...state,
    matched: [...state.matched].sort((left, right) => left - right),
  });
});

test('name validation allows the input boundary and rejects invalid types and longer strings', () => {
  assert.ok(decodeSnapshot(JSON.stringify(fields('x'.repeat(GAME_NAME_MAX_CHARACTERS)))));
  assert.ok(decodeSnapshot(JSON.stringify(fields('🌙'.repeat(GAME_NAME_MAX_CHARACTERS / 2)))));
  for (const name of [null, true, 42, [], {}, 'x'.repeat(GAME_NAME_MAX_CHARACTERS + 1)])
    assert.equal(decodeSnapshot(JSON.stringify(fields(name))), null);
});

test('named snapshots require every progress field and reject extra metadata', () => {
  const named = fields('My game');
  for (const missing of SNAPSHOT_KEYS) {
    const remaining = Object.fromEntries(Object.entries(named).filter(([key]) => key !== missing));
    assert.equal(decodeSnapshot(JSON.stringify(remaining)), null);
    assert.equal(decodeSnapshot(JSON.stringify({ ...remaining, extra: true })), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...named, extra: true })), null);
});

test('named snapshots retain the exact UTF-8 byte limit', () => {
  const text = JSON.stringify(fields('星'.repeat(GAME_NAME_MAX_CHARACTERS)));
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.equal(Buffer.byteLength(padded), SNAPSHOT_MAX_BYTES);
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
