import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot, GAME_NAME_MAX_CHARACTERS } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('named and legacy snapshots load regardless of property order', () => {
  const state = { ...createGame(EXAMPLE_CODE), name: '夜 ✨ game' };
  const named: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(named && typeof named === 'object');
  const reordered = Object.fromEntries(Object.entries(named).reverse());
  assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), state);
  assert.deepEqual(
    decodeSnapshot(encodeSnapshot(createGame(EXAMPLE_CODE))),
    createGame(EXAMPLE_CODE),
  );
  assert.equal(decodeSnapshot(JSON.stringify({ ...reordered, name: 42 })), null);
  assert.equal(
    decodeSnapshot(
      JSON.stringify({ ...reordered, name: 'x'.repeat(GAME_NAME_MAX_CHARACTERS + 1) }),
    ),
    null,
  );
  assert.equal(decodeSnapshot(JSON.stringify({ ...reordered, extra: true })), null);
  const { boardCode: _boardCode, ...missing } = reordered;
  assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
});
