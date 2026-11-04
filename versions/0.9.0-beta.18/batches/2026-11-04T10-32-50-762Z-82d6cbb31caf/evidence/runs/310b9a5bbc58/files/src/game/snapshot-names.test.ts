import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';

const UNNAMED = {
  version: 1,
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'closed' },
  moves: 0,
  elapsedMs: 0,
  started: false,
};

test('named snapshots preserve exact names and progress in version two', () => {
  const progress = advanceGame(activateCard(activateCard(createGame('np1-4-1'), 0), 1), 175);
  for (const name of ['Café', '  Café 🃏  ', ' ', '🃏'.repeat(20), 'a'.repeat(40), '\t<>"\\']) {
    const state = { ...progress, name };
    const text = encodeSnapshot(state);
    const value: unknown = JSON.parse(text);
    assert.ok(isJsonObject(value));
    assert.equal(value.version, 2);
    assert.equal(value.name, name);
    assert.deepEqual(Object.keys(value).sort(), [...Object.keys(UNNAMED), 'name'].sort());
    assert.deepEqual(decodeSnapshot(text), state);
  }
});

test('unnamed snapshots keep version one without a name field', () => {
  const state = createGame('np1-4-1');
  assert.deepEqual(JSON.parse(encodeSnapshot(state)), UNNAMED);
  assert.equal(decodeSnapshot(JSON.stringify(UNNAMED))?.name, '');
});

test('named imports reject missing, empty, oversized, multiline and nonstring names', () => {
  for (const name of [
    undefined,
    '',
    null,
    1,
    false,
    [],
    {},
    'x'.repeat(41),
    '🃏'.repeat(21),
    '\r',
    '\n',
    'a\r\nb',
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, version: 2, name })), null);
  for (const version of [0, 3, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, version, name: 'Café' })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, name: 'Café' })), null);
});

test('named imports retain progress validation and the UTF-8 byte limit', () => {
  const named = { ...UNNAMED, version: 2, name: 'Café 🃏' };
  for (const fields of [
    { extra: true },
    { moves: 1_000_000 },
    { elapsedMs: 360_000_000 },
    { matched: [0] },
    { started: true },
    { selection: { kind: 'closed', extra: true } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...named, ...fields })), null);
  const text = JSON.stringify(named);
  const padded = text + ' '.repeat(65536 - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
