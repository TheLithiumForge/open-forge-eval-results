import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_KEYS } from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const GAME = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);

function savedGame(): Record<string, unknown> {
  const value: unknown = JSON.parse(encodeSnapshot(GAME));
  assert.ok(isJsonObject(value));
  return value;
}

test('snapshot fields can appear in every starting position and reverse order', () => {
  const entries = Object.entries(savedGame());
  const orders = [
    [...entries].reverse(),
    ...entries.map((_, index) => [...entries.slice(index), ...entries.slice(0, index)]),
  ];
  for (const order of orders)
    assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(order))), GAME);
});

test('reordered snapshots still reject missing fields and unknown keys', () => {
  const entries = Object.entries(savedGame()).reverse();
  for (const missing of SNAPSHOT_KEYS) {
    const value = Object.fromEntries(entries.filter(([key]) => key !== missing));
    assert.equal(decodeSnapshot(JSON.stringify(value)), null, `missing ${missing}`);
    assert.equal(decodeSnapshot(JSON.stringify({ ...value, unexpected: true })), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ unexpected: true, ...savedGame() })), null);
});

test('optional game names round trip verbatim while unnamed saves keep their format', () => {
  assert.deepEqual(Object.keys(savedGame()).sort(), [...SNAPSHOT_KEYS].sort());
  for (const name of ['', 'Friday pairs', '  Café 🎮 "one more" \\ two  ']) {
    const named = { name, ...savedGame() };
    const loaded = decodeSnapshot(JSON.stringify(named));
    assert.deepEqual(loaded, { ...GAME, name });
    assert.ok(loaded);
    assert.deepEqual(JSON.parse(encodeSnapshot(loaded)), named);
    const advanced = advanceGame(activateCard(advanceGame(loaded, 1000), 2), 100);
    assert.equal(advanced.name, name);
  }
});

test('a supplied game name must be a string and cannot hide extra or missing fields', () => {
  for (const name of [null, false, 42, [], {}])
    assert.equal(decodeSnapshot(JSON.stringify({ name, ...savedGame() })), null);
  assert.equal(
    decodeSnapshot(JSON.stringify({ name: 'Friday', ...savedGame(), extra: true })),
    null,
  );
  const { moves, ...missing } = savedGame();
  assert.equal(moves, GAME.moves);
  assert.equal(decodeSnapshot(JSON.stringify({ name: 'Friday', ...missing })), null);
});
