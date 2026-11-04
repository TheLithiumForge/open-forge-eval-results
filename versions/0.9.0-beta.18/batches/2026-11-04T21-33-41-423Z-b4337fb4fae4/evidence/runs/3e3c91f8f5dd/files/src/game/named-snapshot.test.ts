import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const BASE = {
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'closed' },
  moves: 0,
  elapsedMs: 0,
  started: false,
};

test('snapshots accept reordered fields and retain a named deal exactly', () => {
  const unnamed = { ...BASE, version: 1 };
  const named = { ...BASE, name: '  Café 🎮  ', version: 2 };
  assert.equal(decodeSnapshot(JSON.stringify(unnamed))?.name, '');
  assert.equal(decodeSnapshot(JSON.stringify(named))?.name, named.name);
  const state = { ...createGame(BASE.boardCode), name: named.name };
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  assert.deepEqual(JSON.parse(encodeSnapshot(state)), named);
  assert.equal(JSON.parse(encodeSnapshot(createGame(BASE.boardCode))).version, 1);
});

test('named snapshots validate version, exact fields and UTF-16 name constraints', () => {
  for (const name of [' ', '🎮'.repeat(20), '\t']) {
    assert.equal(decodeSnapshot(JSON.stringify({ version: 2, ...BASE, name }))?.name, name);
  }
  for (const name of ['', 'x'.repeat(41), '🎮'.repeat(21), 'line\nfeed', 'return\r', 1, null]) {
    assert.equal(decodeSnapshot(JSON.stringify({ version: 2, ...BASE, name })), null);
  }
  for (const value of [
    { version: 2, ...BASE },
    { version: 1, ...BASE, name: 'name' },
    { version: 2, ...BASE, name: 'name', extra: 1 },
    { version: 3, ...BASE, name: 'name' },
    { version: 1, ...BASE, extra: 1 },
  ])
    assert.equal(decodeSnapshot(JSON.stringify(value)), null);
});
