import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';

const NAMED = {
  name: 'Café',
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
  version: 2,
};

test('named progress accepts reordered fields and round trips names unchanged', () => {
  const first = activateCard(createGame('np1-4-1'), 2);
  for (const name of ['Café', '  Café 🃏  ', ' ', 'a'.repeat(40), '🃏'.repeat(20), '\tname\t']) {
    const state = { ...first, name };
    assert.deepEqual(decodeSnapshot(JSON.stringify({ ...NAMED, name })), state);
    assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  }
  const text = encodeSnapshot({ ...first, name: 'Café' });
  assert.deepEqual(JSON.parse(text), NAMED);
  assert.ok(text.includes('\n'), 'export remains readable');
});

test('both snapshot versions keep strict name and schema validation', () => {
  const { name, ...unnamed } = NAMED;
  assert.equal(name, 'Café');
  assert.equal(decodeSnapshot(JSON.stringify(unnamed)), null, 'version 2 needs a name');
  for (const invalid of ['', null, 2, [], {}, 'a'.repeat(41), '🃏'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name: invalid })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version: 1 })), null);
  for (const version of [0, 3, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version })), null);
  for (const field of Object.keys(NAMED)) {
    const incomplete = Object.fromEntries(Object.entries(NAMED).filter(([key]) => key !== field));
    assert.equal(decodeSnapshot(JSON.stringify(incomplete)), null, field);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, extra: true })), null);
  const text = JSON.stringify(NAMED);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});

test('names survive turns and timing and clearing a name exports only version 1 fields', () => {
  const named = { ...createGame('np1-4-1'), name: 'Pending' };
  const state = advanceGame(activateCard(activateCard(named, 0), 1), 0.75);
  const restored = decodeSnapshot(encodeSnapshot(state));
  assert.ok(restored);
  assert.equal(restored.name, named.name);
  assert.equal(restored.elapsedMs, 0);
  assert.deepEqual(restored.selection, { kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
  const unnamed: unknown = JSON.parse(encodeSnapshot({ ...state, name: '' }));
  assert.deepEqual(unnamed, {
    version: 1,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 800 },
    moves: 1,
    elapsedMs: 0,
    started: true,
  });
});
