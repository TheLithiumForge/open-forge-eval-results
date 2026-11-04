import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';

const initial = createGame('np1-4-1');

test('both snapshot versions accept reordered fields and preserve names exactly', () => {
  const game = { ...activateCard(initial, 2), name: '  Café 🎮  ' };
  const exported: unknown = JSON.parse(encodeSnapshot(game));
  assert.ok(isJsonObject(exported));
  assert.equal(exported.version, 2);
  assert.deepEqual(decodeSnapshot(JSON.stringify(exported)), game);
  const reordered = Object.fromEntries(Object.entries(exported).reverse());
  assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), game);
  const unnamed: unknown = JSON.parse(encodeSnapshot(initial));
  assert.ok(isJsonObject(unnamed));
  assert.equal(unnamed.version, 1);
  assert.equal('name' in unnamed, false);
  assert.deepEqual(
    decodeSnapshot(JSON.stringify(Object.fromEntries(Object.entries(unnamed).reverse()))),
    initial,
  );
});

test('named snapshots require exactly a nonempty single-line name of at most 40 UTF-16 units', () => {
  const named: unknown = JSON.parse(encodeSnapshot({ ...initial, name: 'x' }));
  assert.ok(isJsonObject(named));
  for (const name of ['', 'x'.repeat(41), '🎮'.repeat(21), 'a\nb', 'a\rb', 1, null]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...named, name })), null);
  }
  for (const name of [' '.repeat(40), '🎮'.repeat(20), '\t']) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...named, name }))?.name, name);
  }
  const { name: _name, ...missing } = named;
  assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...named, extra: 1 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...named, version: 1 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...named, version: 3 })), null);
});
