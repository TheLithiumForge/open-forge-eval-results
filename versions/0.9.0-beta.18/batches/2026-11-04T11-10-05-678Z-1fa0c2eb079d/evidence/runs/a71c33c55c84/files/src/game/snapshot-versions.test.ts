import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { renameGame } from './deal-name.ts';
import { decodeSnapshot, encodeSnapshot, NAMED_SNAPSHOT_VERSION } from './snapshot.ts';
import { replayGame } from './replay.ts';

const UNNAMED = {
  version: 1,
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'closed' },
  moves: 0,
  elapsedMs: 0,
  started: false,
};
const NAMED = { ...UNNAMED, version: 2, name: '  Café 😀  ' };

test('snapshot schemas accept every field first and reversed object properties', () => {
  for (const snapshot of [UNNAMED, NAMED]) {
    const entries = Object.entries(snapshot);
    const expected = { ...createGame('np1-4-1'), name: snapshot.version === 2 ? NAMED.name : '' };
    for (let index = 0; index < entries.length; index += 1) {
      const rotated = [...entries.slice(index), ...entries.slice(0, index)];
      assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(rotated))), expected);
    }
    assert.deepEqual(
      decodeSnapshot(JSON.stringify(Object.fromEntries(entries.reverse()))),
      expected,
    );
  }
});

test('named snapshots restore the documented progress and preserve exact name text', () => {
  const text =
    '{"version":2,"name":"Café","boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":2},"moves":0,"elapsedMs":0,"started":true}';
  const state = decodeSnapshot(text);
  assert.deepEqual(state, renameGame(activateCard(createGame('np1-4-1'), 2), 'Café'));
  for (const name of ['  Café 😀  ', ' ', '\t', '\u0000', '\u2028\u2029', '😀'.repeat(20)]) {
    const named = renameGame(createGame('np1-4-1'), name);
    assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);
  }
});

test('named progress exports version two and clearing its name restores the exact version one schema', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const named = renameGame(createGame('np1-4-1'), NAMED.name);
  assert.deepEqual(JSON.parse(encodeSnapshot(named)), NAMED);
  assert.deepEqual(JSON.parse(encodeSnapshot(renameGame(named, ''))), UNNAMED);
  assert.equal(decodeSnapshot(JSON.stringify(UNNAMED))?.name, '');
});

test('snapshot names reject invalid types, empty names, line breaks and excess UTF-16 units', () => {
  for (const name of [
    null,
    1,
    false,
    {},
    [],
    '',
    '\r',
    '\n',
    'a\r\nb',
    'a'.repeat(41),
    '😀'.repeat(21),
  ]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
  }
});

test('both snapshot versions require exact keys and reject unsupported versions', () => {
  for (const snapshot of [UNNAMED, NAMED]) {
    for (const field of Object.keys(snapshot)) {
      const withoutField = Object.fromEntries(
        Object.entries(snapshot).filter(([key]) => key !== field),
      );
      assert.equal(decodeSnapshot(JSON.stringify(withoutField)), null);
    }
    assert.equal(decodeSnapshot(JSON.stringify({ ...snapshot, extra: true })), null);
    for (const version of [0, 3, -1, '1', null]) {
      assert.equal(decodeSnapshot(JSON.stringify({ ...snapshot, version })), null);
    }
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, name: 'Café' })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, version: 2 })), null);
});

test('named imports retain strict progress validation independent of property order', () => {
  for (const fields of [
    { matched: [0] },
    { matched: [0, 1], moves: 1, started: true },
    { selection: { kind: 'closed', extra: true } },
    { elapsedMs: 0.5 },
    { elapsedMs: 360000000 },
    { moves: 1000000 },
    { started: true },
  ]) {
    const value = { ...NAMED, ...fields };
    assert.equal(
      decodeSnapshot(JSON.stringify(Object.fromEntries(Object.entries(value).reverse()))),
      null,
    );
  }
  const value = { ...NAMED, selection: { index: 2, kind: 'one' }, started: true };
  assert.equal(decodeSnapshot(JSON.stringify(value))?.selection.kind, 'one');
});

test('named exports retain fractional clock rounding and pending mismatch bounds', () => {
  const mismatch = activateCard(activateCard(createGame('np1-4-1'), 0), 1);
  const state = renameGame(advanceGame(mismatch, 799.75), 'Café');
  const restored = decodeSnapshot(encodeSnapshot(state));
  assert.equal(restored?.name, 'Café');
  assert.equal(restored?.elapsedMs, 799);
  assert.deepEqual(restored?.selection, { kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
});

test('named snapshots enforce the UTF-8 byte limit with multibyte names', () => {
  const text = JSON.stringify(NAMED);
  const padded = text + ' '.repeat(65536 - Buffer.byteLength(text, 'utf8'));
  assert.equal(decodeSnapshot(padded)?.name, NAMED.name);
  assert.equal(decodeSnapshot(padded + ' '), null);
});

test('replays stay unnamed and export version one snapshots', () => {
  const result = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[],"endMs":0}');
  assert.ok(result);
  assert.equal(result.name, '');
  assert.deepEqual(JSON.parse(encodeSnapshot(result)), UNNAMED);
});
