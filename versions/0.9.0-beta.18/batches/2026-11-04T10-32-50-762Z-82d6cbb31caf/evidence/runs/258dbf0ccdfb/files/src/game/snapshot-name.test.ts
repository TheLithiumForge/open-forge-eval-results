import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { renameGame } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';

const NAMED = {
  name: '  Café 🃏  ',
  boardCode: 'np1-4-1',
  matched: [0, 11],
  selection: { second: 2, first: 1, remainingMs: 300, kind: 'mismatch' },
  moves: 2,
  elapsedMs: 1500,
  started: true,
  version: 2,
};

test('named snapshots restore exact names and progress regardless of member order', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const entries = Object.entries(NAMED);
  for (let offset = 0; offset < entries.length; offset += 1) {
    const fields = [...entries.slice(offset), ...entries.slice(0, offset)];
    const state = decodeSnapshot(JSON.stringify(Object.fromEntries(fields)));
    assert.ok(state);
    assert.equal(state.name, NAMED.name);
    assert.deepEqual(JSON.parse(encodeSnapshot(state)), NAMED);
  }
});

test('names use version 2 and clearing a name restores the exact version 1 format', () => {
  const initial = createGame('np1-4-1');
  for (const name of ['Café', ' ', 'a'.repeat(40), '🃏'.repeat(20), '\t"<>&\u2028']) {
    const named = renameGame(initial, name);
    assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);
    const encoded: unknown = JSON.parse(encodeSnapshot(named));
    assert.deepEqual(encoded, {
      version: 2,
      name,
      boardCode: 'np1-4-1',
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    });
    assert.equal(encodeSnapshot(renameGame(named, '')), encodeSnapshot(initial));
  }
  assert.equal(decodeSnapshot(encodeSnapshot(initial))?.name, '');
});

test('both snapshot versions enforce their complete field sets and name rules', () => {
  for (const name of ['', null, false, 42, [], {}, 'a'.repeat(41), '🃏'.repeat(21), '\r', 'a\nb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
  for (const key of Object.keys(NAMED)) {
    const missing: Record<string, unknown> = { ...NAMED };
    delete missing[key];
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
    assert.equal(decodeSnapshot(JSON.stringify({ ...missing, extra: true })), null);
  }
  for (const version of [0, 1, 3, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, extra: true })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version: 1, name: '' })), null);
});

test('named snapshots retain progress validation and count the UTF-8 byte limit', () => {
  for (const invalid of [
    { moves: 1 },
    { matched: [0] },
    { started: false },
    { elapsedMs: 359_999_999 + 1 },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...invalid })), null);
  const text = JSON.stringify(NAMED);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.ok(decodeSnapshot(padded));
  assert.ok(padded.length + 1 <= SNAPSHOT_MAX_BYTES, 'characters can fit while UTF-8 bytes exceed');
  assert.equal(decodeSnapshot(padded + ' '), null);
});
