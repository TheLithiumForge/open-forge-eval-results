import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const base = {
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('both snapshot versions accept reordered fields and preserve names exactly', () => {
  for (const name of [' Café ', ' ', '😀'.repeat(20)]) {
    const state = decodeSnapshot(JSON.stringify({ ...base, name, version: 2 }));
    assert.ok(state);
    assert.equal(state.name, name);
    assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
    assert.equal(JSON.parse(encodeSnapshot(state)).version, 2);
  }
  const state = decodeSnapshot(JSON.stringify({ ...base, version: 1 }));
  assert.ok(state);
  assert.equal(state.name, '');
  assert.equal(JSON.parse(encodeSnapshot(state)).version, 1);
  assert.equal('name' in JSON.parse(encodeSnapshot(createGame('np1-4-1'))), false);
});

test('snapshot names and version-specific keys are strictly validated', () => {
  for (const name of ['', 'a'.repeat(41), '😀'.repeat(21), 'line\nbreak', 'line\rbreak', 7]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...base, version: 2, name })), null);
  }
  for (const extra of [
    { version: 1, name: 'name' },
    { version: 2 },
    { version: 2, name: 'name', extra: true },
    { version: 3, name: 'name' },
  ]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...base, ...extra })), null);
  }
});
