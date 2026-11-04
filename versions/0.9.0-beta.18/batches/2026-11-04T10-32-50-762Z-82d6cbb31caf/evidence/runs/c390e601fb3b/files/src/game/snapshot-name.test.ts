import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { isDealName } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';

const NAMED = {
  version: 2,
  name: 'Café',
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('named snapshots restore the documented example and preserve exact name characters', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const one = activateCard(createGame('np1-4-1'), 2);
  assert.deepEqual(decodeSnapshot(JSON.stringify(NAMED)), { ...one, name: 'Café' });
  const pending = advanceGame(activateCard(one, 1), 125);
  for (const name of ['Café', '  Café 😀  ', '   ', '\t"\\\u0000', 'e\u0301', '😀'.repeat(20)]) {
    assert.equal(isDealName(name), true);
    const state = { ...pending, name };
    const text = encodeSnapshot(state);
    assert.equal(JSON.parse(text).version, 2);
    assert.equal(JSON.parse(text).name, name);
    assert.deepEqual(decodeSnapshot(text), state);
  }
});

test('empty names use the original version with no name field', () => {
  const initial = createGame('np1-4-1');
  assert.equal(initial.name, '');
  const text = encodeSnapshot(initial);
  assert.equal(JSON.parse(text).version, 1);
  assert.equal(Object.hasOwn(JSON.parse(text), 'name'), false);
  assert.deepEqual(decodeSnapshot(text), initial);
  const named = decodeSnapshot(JSON.stringify(NAMED));
  assert.ok(named);
  assert.equal(JSON.parse(encodeSnapshot({ ...named, name: '' })).version, 1);
});

test('named imports enforce nonempty names and the UTF-16 limit without trimming', () => {
  const maximum = '😀'.repeat(19) + 'ab';
  assert.ok(decodeSnapshot(JSON.stringify({ ...NAMED, name: maximum })));
  for (const name of [null, 1, false, [], {}, '', 'x'.repeat(41), maximum + 'x', 'a\rb', 'a\nb']) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
    if (name !== '') assert.equal(isDealName(name), false);
  }
  assert.equal(isDealName(''), true);
  for (const name of ['', 'Café'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version: 1, name })), null);
  const { name, ...withoutName } = NAMED;
  assert.equal(name, 'Café');
  assert.equal(decodeSnapshot(JSON.stringify(withoutName)), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, extra: true })), null);
  for (const version of [0, 3, 1.5, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version })), null);
});

test('named snapshots retain progress validation and the exact UTF-8 byte limit', () => {
  for (const invalid of [
    { moves: -1 },
    { elapsedMs: 359_999_999 + 1 },
    { matched: [0] },
    { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'one', index: 2, extra: true } },
    { started: false },
  ]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...invalid })), null);
  }
  const text = JSON.stringify(NAMED);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
  const characterPadded = text.padEnd(SNAPSHOT_MAX_BYTES, ' ');
  assert.equal(decodeSnapshot(characterPadded), null, 'multibyte names count UTF-8 bytes');
});
