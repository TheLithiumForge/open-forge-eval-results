import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const initial = createGame('np1-4-1');
const unnamed: Record<string, unknown> = JSON.parse(encodeSnapshot(initial));

test('snapshot fields can appear in a different order for either version', () => {
  const reordered = Object.fromEntries(Object.entries(unnamed).reverse());
  assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), initial);
  const named = { name: ' Café ', ...reordered, version: 2 };
  assert.deepEqual(decodeSnapshot(JSON.stringify(named)), { ...initial, name: ' Café ' });
  assert.deepEqual(JSON.parse(encodeSnapshot({ ...initial, name: ' Café ' })), named);
  assert.deepEqual(JSON.parse(encodeSnapshot(initial)), unnamed);
});

test('named snapshots require exactly a valid nonempty name', () => {
  for (const name of ['', 'a'.repeat(41), 'line\nfeed', 'carriage\rreturn', 3, null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...unnamed, version: 2, name })), null);
  for (const name of [' '.repeat(40), '😀'.repeat(20), '\t café '])
    assert.equal(decodeSnapshot(JSON.stringify({ ...unnamed, version: 2, name }))?.name, name);
  assert.equal(decodeSnapshot(JSON.stringify({ ...unnamed, name: 'extra' })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...unnamed, version: 2 })), null);
  assert.equal(
    decodeSnapshot(JSON.stringify({ ...unnamed, version: 2, name: 'ok', extra: 1 })),
    null,
  );
  assert.equal(decodeSnapshot(JSON.stringify({ ...unnamed, version: 3, name: 'ok' })), null);
});
