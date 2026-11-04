import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame, setDealName } from './game.ts';
import { isJsonObject } from './saved-format.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const LEGACY = {
  boardCode: EXAMPLE_CODE,
  selection: { kind: 'one', index: 0 },
  matched: [],
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('unnamed exports remain version 1 and named exports carry version 2', () => {
  assert.equal(SNAPSHOT_VERSION, 1);
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const unnamed = createGame(EXAMPLE_CODE);
  const unnamedJson: unknown = JSON.parse(encodeSnapshot(unnamed));
  assert.ok(isJsonObject(unnamedJson));
  assert.equal(unnamedJson.version, SNAPSHOT_VERSION);
  assert.deepEqual(Object.keys(unnamedJson).sort(), [...SNAPSHOT_KEYS].sort());

  const named = setDealName(activateCard(unnamed, 0), 'Café');
  const namedJson: unknown = JSON.parse(encodeSnapshot(named));
  assert.ok(isJsonObject(namedJson));
  assert.equal(namedJson.version, NAMED_SNAPSHOT_VERSION);
  assert.equal(namedJson.name, 'Café');
  assert.deepEqual(Object.keys(namedJson).sort(), [...NAMED_SNAPSHOT_KEYS].sort());
  assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);
});

test('version 1 and version 2 imports accept reordered object properties', () => {
  const versionOne = decodeSnapshot(
    JSON.stringify({ ...LEGACY, selection: { index: 0, kind: 'one' }, version: 1 }),
  );
  assert.ok(versionOne);
  assert.equal(versionOne.name, '');

  const versionTwo = decodeSnapshot(JSON.stringify({ name: 'saved game', ...LEGACY, version: 2 }));
  assert.ok(versionTwo);
  assert.equal(versionTwo.name, 'saved game');
});

test('a named pending mismatch round trips with its remaining time', () => {
  const mismatch = activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1);
  const named = setDealName(mismatch, 'pending');
  assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);
});

test('snapshot names preserve spaces and enforce exact import fields and name rules', () => {
  const named = { ...LEGACY, name: '  Café  ', version: 2 };
  assert.equal(decodeSnapshot(JSON.stringify(named))?.name, '  Café  ');
  const invalid = [
    { ...LEGACY, version: 3 },
    { ...LEGACY, version: 1, name: '' },
    { ...LEGACY, version: 2 },
    { ...LEGACY, version: 2, name: '' },
    { ...LEGACY, version: 2, name: '😀'.repeat(21) },
    { ...LEGACY, version: 2, name: 3 },
    { ...LEGACY, version: 2, name: 'line\nfeed' },
    { ...LEGACY, version: 2, name: 'line\rreturn' },
    { ...LEGACY, version: 2, name: 'ok', extra: true },
  ];
  for (const value of invalid) assert.equal(decodeSnapshot(JSON.stringify(value)), null);
});

test('named snapshots apply the UTF-8 size limit to Unicode JSON', () => {
  const text = JSON.stringify({ ...LEGACY, version: 2, name: 'Café 😀' });
  const exact = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.equal(Buffer.byteLength(exact, 'utf8'), SNAPSHOT_MAX_BYTES);
  assert.equal(decodeSnapshot(exact)?.name, 'Café 😀');
  assert.equal(decodeSnapshot(`${exact} `), null);
});
