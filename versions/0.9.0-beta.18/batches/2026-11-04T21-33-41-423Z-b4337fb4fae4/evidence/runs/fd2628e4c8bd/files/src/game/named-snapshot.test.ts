import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const initial = createGame('np1-4-1');
const named = { ...activateCard(initial, 2), name: '  Café 🎮  ' };

test('named and unnamed snapshots round trip independently of property order', () => {
  const encoded = encodeSnapshot(named);
  assert.deepEqual(decodeSnapshot(encoded), named);
  const reordered = {
    started: true,
    elapsedMs: 0,
    moves: 0,
    selection: { index: 2, kind: 'one' },
    matched: [],
    boardCode: 'np1-4-1',
    name: named.name,
    version: 2,
  };
  assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), named);
  const { name: _name, ...unnamed } = reordered;
  assert.deepEqual(decodeSnapshot(JSON.stringify({ ...unnamed, version: 1 })), {
    ...named,
    name: '',
  });
  assert.equal(JSON.parse(encodeSnapshot(initial)).version, 1);
  assert.equal(JSON.parse(encoded).version, 2);
});

test('name validation rejects invalid version fields and counts UTF-16 code units', () => {
  const base = JSON.parse(encodeSnapshot(named));
  for (const name of ['', 'a'.repeat(41), '🎮'.repeat(21), 'a\nb', 'a\rb', null, 1])
    assert.equal(decodeSnapshot(JSON.stringify({ ...base, name })), null);
  for (const name of [' ', '🎮'.repeat(20), 'a'.repeat(40)])
    assert.equal(decodeSnapshot(JSON.stringify({ ...base, name }))?.name, name);
  const { name: _name, ...withoutName } = base;
  assert.equal(decodeSnapshot(JSON.stringify(withoutName)), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...base, version: 1 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...base, version: 3 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...base, extra: true })), null);
});
