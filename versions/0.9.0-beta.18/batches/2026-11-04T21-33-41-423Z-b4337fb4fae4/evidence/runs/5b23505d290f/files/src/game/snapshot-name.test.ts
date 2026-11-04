import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';

const baseline = {
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('both snapshot versions accept properties in arbitrary order, including nested selections', () => {
  const unnamed = { ...baseline, selection: { index: 2, kind: 'one' }, version: 1 };
  const named = { name: ' Café ', ...baseline, version: 2 };
  assert.equal(decodeSnapshot(JSON.stringify(unnamed))?.name, '');
  assert.equal(decodeSnapshot(JSON.stringify(named))?.name, ' Café ');
  assert.deepEqual(
    decodeSnapshot(encodeSnapshot({ ...createGame('np1-4-1'), name: ' Café ' }))?.name,
    ' Café ',
  );
  const exported: unknown = JSON.parse(encodeSnapshot(createGame('np1-4-1')));
  assert.ok(isJsonObject(exported));
  assert.equal(exported.version, 1);
});

test('named snapshots enforce exact fields and UTF-16 name limits', () => {
  const named = { ...baseline, version: 2, name: '😀'.repeat(20) };
  assert.ok(decodeSnapshot(JSON.stringify(named)));
  for (const name of ['', 'x'.repeat(41), '😀'.repeat(21), 'a\nb', 'a\rb', null, 42]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...named, name })), null);
  }
  assert.ok(decodeSnapshot(JSON.stringify({ ...named, name: ' ' })));
  assert.equal(decodeSnapshot(JSON.stringify({ ...named, extra: true })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...named, version: 1 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...baseline, version: 2 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...named, version: 3 })), null);
});
