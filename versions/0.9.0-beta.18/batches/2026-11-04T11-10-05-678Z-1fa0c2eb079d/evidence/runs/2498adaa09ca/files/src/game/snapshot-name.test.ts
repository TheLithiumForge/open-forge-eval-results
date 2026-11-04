import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame, GAME_NAME_MAX_CHARACTERS } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const progress = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);

function exportedProgress(): Record<string, unknown> {
  const value: unknown = JSON.parse(encodeSnapshot(progress));
  assert.ok(isJsonObject(value));
  return value;
}

test('optional names preserve Unicode and progress with reordered snapshot properties', () => {
  for (const name of ['Night 🌙 — café <pairs>', 'A "quoted" game', 'é'.repeat(100)]) {
    const state = { ...progress, name };
    const text = encodeSnapshot(state);
    assert.deepEqual(decodeSnapshot(text), state);
    const fields = { ...exportedProgress(), name };
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(fields).reverse()));
    const restored = decodeSnapshot(reordered);
    assert.deepEqual(restored, state);
    assert.ok(restored);
    assert.equal(encodeSnapshot(restored), text);
  }
});

test('unnamed snapshots retain their original format and empty names export as unnamed', () => {
  const original = encodeSnapshot(progress);
  assert.equal(Object.hasOwn(exportedProgress(), 'name'), false);
  assert.deepEqual(decodeSnapshot(original), progress);
  assert.equal(encodeSnapshot({ ...progress, name: '' }), original);
  assert.deepEqual(decodeSnapshot(JSON.stringify({ ...exportedProgress(), name: '' })), progress);
  const namedFresh = { ...createGame(EXAMPLE_CODE), name: 'A fresh deal' };
  assert.deepEqual(decodeSnapshot(encodeSnapshot(namedFresh)), namedFresh);
});

test('named snapshots reject invalid names and keep every required progress field', () => {
  assert.equal(GAME_NAME_MAX_CHARACTERS, 100);
  for (const name of [null, false, 12, [], {}, 'a'.repeat(101)])
    assert.equal(decodeSnapshot(JSON.stringify({ ...exportedProgress(), name })), null);
  const named = { ...exportedProgress(), name: 'Saved game' };
  for (const key of Object.keys(exportedProgress())) {
    const missing = Object.fromEntries(Object.entries(named).filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
  }
  for (const invalid of [
    { ...named, extra: true },
    { ...named, version: 2 },
    { ...named, moves: -1 },
    { ...named, matched: [0] },
  ])
    assert.equal(decodeSnapshot(JSON.stringify(invalid)), null);
});

test('the snapshot byte limit includes multibyte names', () => {
  const text = encodeSnapshot({ ...progress, name: 'é'.repeat(100) });
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.equal(decodeSnapshot(padded)?.name, 'é'.repeat(100));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
