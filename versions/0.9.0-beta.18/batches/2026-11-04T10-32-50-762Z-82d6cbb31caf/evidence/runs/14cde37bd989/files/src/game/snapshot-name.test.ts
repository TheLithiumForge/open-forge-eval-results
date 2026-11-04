import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';
import { EXAMPLE_PAIRS } from './game.fixture.ts';
import { isJsonObject } from './saved-format.ts';

const NAMED = {
  name: '  Café 🃏  ',
  boardCode: 'np1-4-1',
  matched: [],
  selection: { index: 2, kind: 'one' },
  moves: 0,
  elapsedMs: 0,
  started: true,
  version: 2,
};

test('named snapshots preserve names through play, elapsed time and every selection state', () => {
  const initial = { ...createGame('np1-4-1'), name: NAMED.name };
  const one = activateCard(initial, 0);
  const mismatch = advanceGame(activateCard(one, 1), 175);
  let won = initial;
  for (const pair of EXAMPLE_PAIRS) for (const index of pair) won = activateCard(won, index);
  for (const state of [initial, one, mismatch, won]) {
    const text = encodeSnapshot(state);
    assert.deepEqual(decodeSnapshot(text), {
      ...state,
      matched: [...state.matched].sort((left, right) => left - right),
    });
    const value: unknown = JSON.parse(text);
    assert.ok(isJsonObject(value));
    assert.equal(value.version, 2);
    assert.equal(value.name, NAMED.name);
  }
  const unnamed: unknown = JSON.parse(encodeSnapshot({ ...mismatch, name: '' }));
  assert.ok(isJsonObject(unnamed));
  assert.equal(unnamed.version, 1);
  assert.equal(Object.hasOwn(unnamed, 'name'), false);
  assert.equal(decodeSnapshot(JSON.stringify(unnamed))?.name, '');
});

test('named imports accept reordered properties without normalizing their characters', () => {
  for (const name of ['Café', 'Cafe\u0301', ' ', '\t', '\u0000', 'a'.repeat(40), '🃏'.repeat(20)]) {
    for (const [first, value] of Object.entries(NAMED)) {
      const text = JSON.stringify({ [first]: value, ...NAMED, name });
      assert.equal(decodeSnapshot(text)?.name, name);
    }
  }
});

test('named imports reject missing, empty, nonstring, overlong and multiline names', () => {
  for (const name of [
    null,
    false,
    12,
    {},
    [],
    '',
    'a'.repeat(41),
    '🃏'.repeat(21),
    '\r',
    '\n',
    'a\r\nb',
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
  for (const key of Object.keys(NAMED)) {
    const missing = Object.fromEntries(Object.entries(NAMED).filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ extra: true, ...NAMED })), null);
  for (const version of [0, 1, 3, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version })), null);
});

test('named snapshots keep strict progress validation and the UTF-8 byte limit', () => {
  for (const invalid of [
    { boardCode: 'np1-4-0' },
    { matched: [0] },
    { matched: [0, 1] },
    { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'one', index: 2, extra: true } },
    { moves: -1 },
    { elapsedMs: 360_000_000 },
    { started: false },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...invalid })), null);
  const text = JSON.stringify(NAMED);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
