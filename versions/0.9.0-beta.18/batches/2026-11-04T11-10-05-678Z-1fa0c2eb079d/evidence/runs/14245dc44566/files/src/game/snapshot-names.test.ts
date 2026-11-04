import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';
import { isJsonObject } from './saved-format.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_VERSION,
} from './snapshot.ts';

const V1 =
  '{"boardCode":"np1-4-1","matched":[],"selection":{"kind":"closed"},"version":1,"moves":0,"elapsedMs":0,"started":false}';
const V2 =
  '{"name":" Café ","boardCode":"np1-4-1","selection":{"kind":"one","index":2},"elapsedMs":0,"started":true,"version":2,"moves":0,"matched":[]}';

test('snapshot decoders accept property order variations and retain unnamed v1 semantics', () => {
  const decoded = decodeSnapshot(V1);
  assert.equal(decoded?.name, '');
  const exported: unknown = JSON.parse(encodeSnapshot(createGame(EXAMPLE_CODE)));
  assert.ok(isJsonObject(exported));
  assert.deepEqual(Object.keys(exported), [...SNAPSHOT_KEYS]);
});

test('named progress round trips in v2 and preserves the exact name', () => {
  const decoded = decodeSnapshot(V2);
  assert.equal(decoded?.name, ' Café ');
  assert.deepEqual(decoded?.selection, { kind: 'one', index: 2 });
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const named = { ...createGame(EXAMPLE_CODE), name: ' Café ' };
  const exported: unknown = JSON.parse(encodeSnapshot(named));
  assert.ok(isJsonObject(exported));
  assert.deepEqual(
    Object.keys(exported).sort(),
    [
      'version',
      'name',
      'boardCode',
      'matched',
      'selection',
      'moves',
      'elapsedMs',
      'started',
    ].sort(),
  );
  assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);
});

test('named snapshot enforces the UTF-8 byte limit', () => {
  const text = encodeSnapshot({ ...createGame(EXAMPLE_CODE), name: 'Café' });
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});

test('deal names preserve allowed characters and validate UTF-16 length and line breaks', () => {
  assert.equal(SNAPSHOT_VERSION, 1);
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  assert.ok(isValidDealName(''));
  assert.ok(isValidDealName(' '.repeat(40)));
  assert.ok(isValidDealName('😀'.repeat(20)));
  for (const invalid of ['x'.repeat(41), '😀'.repeat(21), 'line\nbreak', 'line\rbreak', null, 1])
    assert.equal(isValidDealName(invalid), false);
});

test('named snapshots require a valid nonempty name and exact versioned keys', () => {
  const valid: Record<string, unknown> = {
    version: 2,
    name: 'Café',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'one', index: 2 },
    moves: 0,
    elapsedMs: 0,
    started: true,
  };
  for (const name of ['', 'x'.repeat(41), 'line\nbreak', 'line\rbreak'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, name })), null);
  for (const name of [null, 1, {}, ['Café']])
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, name })), null);
  for (const malformed of [
    { ...valid, unknown: true },
    { ...valid, version: 3 },
    { ...valid, version: 1, name: 'Café' },
    { ...valid, version: 2, name: undefined },
  ])
    assert.equal(decodeSnapshot(JSON.stringify(malformed)), null);
});
