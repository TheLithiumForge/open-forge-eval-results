import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const base = {
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'closed' },
  moves: 0,
  elapsedMs: 0,
  started: false,
};

test('snapshot keys can appear in different orders for both versions', () => {
  assert.deepEqual(
    decodeSnapshot(JSON.stringify({ ...base, version: 1 })),
    createGame(base.boardCode),
  );
  assert.equal(
    decodeSnapshot(JSON.stringify({ ...base, name: ' Café ', version: 2 }))?.name,
    ' Café ',
  );
  assert.equal(decodeSnapshot(JSON.stringify({ ...base, version: 1, extra: true })), null);
});

test('named snapshots preserve valid names and unnamed snapshots remain version 1', () => {
  for (const name of [' Café ', ' ', '😀'.repeat(20)]) {
    const game = { ...createGame(base.boardCode), name };
    const encoded = encodeSnapshot(game);
    assert.equal(JSON.parse(encoded).version, 2);
    assert.deepEqual(decodeSnapshot(encoded), game);
  }
  const unnamed = JSON.parse(encodeSnapshot(createGame(base.boardCode)));
  assert.equal(unnamed.version, 1);
  assert.equal(Object.hasOwn(unnamed, 'name'), false);
});

test('snapshot names and version-specific fields are validated', () => {
  for (const name of ['', 'x'.repeat(41), '😀'.repeat(21), 'a\nb', 'a\rb', 1, null]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...base, version: 2, name })), null);
  }
  for (const value of [
    { ...base, version: 1, name: 'name' },
    { ...base, version: 2 },
    { ...base, version: 3, name: 'name' },
    { ...base, version: 2, name: 'name', extra: true },
  ])
    assert.equal(decodeSnapshot(JSON.stringify(value)), null);
});
