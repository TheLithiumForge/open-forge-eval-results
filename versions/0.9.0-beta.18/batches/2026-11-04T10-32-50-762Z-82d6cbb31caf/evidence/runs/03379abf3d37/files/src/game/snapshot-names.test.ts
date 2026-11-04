import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';

const NAMED = {
  name: 'Café',
  boardCode: 'np1-4-1',
  matched: [],
  selection: { index: 2, kind: 'one' },
  moves: 0,
  elapsedMs: 0,
  started: true,
  version: 2,
};

test('named snapshots preserve exact text and progress in either field order', () => {
  for (const name of ['Café', '  Café 🃏  ', ' ', 'x'.repeat(40), '🃏'.repeat(20), '\t']) {
    const snapshot = { ...NAMED, name };
    const state = decodeSnapshot(JSON.stringify(snapshot));
    assert.ok(state);
    assert.equal(state.name, name);
    assert.deepEqual(JSON.parse(encodeSnapshot(state)), snapshot);
    assert.deepEqual(
      decodeSnapshot(JSON.stringify(Object.fromEntries(Object.entries(snapshot).reverse()))),
      state,
    );
  }
});

test('new deals and unnamed imports keep version one without a name field', () => {
  const initial = createGame('np1-4-1');
  assert.equal(initial.name, '');
  const snapshot = JSON.parse(encodeSnapshot(initial));
  assert.equal(snapshot.version, 1);
  assert.equal(Object.hasOwn(snapshot, 'name'), false);
  assert.deepEqual(decodeSnapshot(JSON.stringify(snapshot)), initial);
});

test('names survive card actions, logical time and a pending mismatch round trip', () => {
  const initial = { ...createGame('np1-4-1'), name: '  Weekend 🃏  ' };
  const pending = advanceGame(activateCard(activateCard(initial, 0), 1), 500);
  assert.equal(pending.name, initial.name);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(pending)), pending);
  const closed = advanceGame(pending, 300);
  const matched = activateCard(activateCard(closed, 2), 6);
  assert.equal(matched.name, initial.name);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(matched)), matched);
});

test('named imports enforce name type, UTF-16 length, line breaks and version keys', () => {
  for (const name of ['', null, 1, false, [], {}, 'x'.repeat(41), '🃏'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
  for (const overrides of [
    { version: 1 },
    { version: 3 },
    { version: '2' },
    { extra: true },
    { selection: { kind: 'one', index: 2, extra: true } },
    { moves: 1_000_000 },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...overrides })), null);
  const { name, ...missingName } = NAMED;
  assert.ok(name);
  assert.equal(decodeSnapshot(JSON.stringify(missingName)), null);
});

test('named snapshots enforce the UTF-8 byte limit including multibyte names', () => {
  const text = JSON.stringify({ ...NAMED, name: '🃏'.repeat(20) });
  assert.ok(Buffer.byteLength(text) > text.length);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
