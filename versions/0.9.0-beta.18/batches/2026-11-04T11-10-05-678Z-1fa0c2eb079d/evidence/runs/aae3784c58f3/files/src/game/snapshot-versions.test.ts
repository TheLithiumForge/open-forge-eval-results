import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_VERSION,
} from './snapshot.ts';

const boardCode = 'np1-4-1';
const closed = { kind: 'closed' };
const one = { index: 0, kind: 'one' };
const name = '  Café 🐈  ';

test('snapshot exports preserve unnamed version one and add the name only for version two', () => {
  const unnamed: unknown = JSON.parse(encodeSnapshot(createGame(boardCode)));
  assert.ok(unnamed && typeof unnamed === 'object');
  assert.deepEqual(Object.keys(unnamed), [...SNAPSHOT_KEYS]);
  assert.equal(SNAPSHOT_VERSION, 1);

  const named: unknown = JSON.parse(encodeSnapshot({ ...createGame(boardCode), name }));
  assert.ok(named && typeof named === 'object');
  assert.deepEqual(Object.keys(named).sort(), [...NAMED_SNAPSHOT_KEYS].sort());
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  assert.deepEqual(decodeSnapshot(encodeSnapshot({ ...createGame(boardCode), name })), {
    ...createGame(boardCode),
    name,
  });
});

test('snapshot imports accept reordered fields and selection keys for either version', () => {
  const unnamedMiddle = {
    boardCode,
    version: SNAPSHOT_VERSION,
    matched: [],
    selection: one,
    moves: 0,
    elapsedMs: 0,
    started: true,
  };
  const unnamedLast = {
    boardCode,
    matched: [],
    selection: closed,
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: SNAPSHOT_VERSION,
  };
  const namedMiddle = {
    name,
    boardCode,
    version: NAMED_SNAPSHOT_VERSION,
    matched: [],
    selection: one,
    moves: 0,
    elapsedMs: 0,
    started: true,
  };
  const namedLast = {
    name,
    boardCode,
    matched: [],
    selection: closed,
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: NAMED_SNAPSHOT_VERSION,
  };

  for (const { value, expectedName } of [
    { value: unnamedMiddle, expectedName: '' },
    { value: unnamedLast, expectedName: '' },
    { value: namedMiddle, expectedName: name },
    { value: namedLast, expectedName: name },
  ]) {
    assert.equal(decodeSnapshot(JSON.stringify(value))?.name, expectedName);
  }
});

test('snapshot imports reject invalid version two names and version one name fields', () => {
  const valid = {
    version: NAMED_SNAPSHOT_VERSION,
    name,
    boardCode,
    matched: [],
    selection: closed,
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
  for (const invalid of [
    { ...valid, name: '' },
    { ...valid, name: 'x'.repeat(41) },
    { ...valid, name: 'x\r' },
    { ...valid, name: 'x\n' },
    { ...valid, version: 3 },
    { ...valid, extra: true },
    { ...valid, name: undefined },
  ]) {
    assert.equal(decodeSnapshot(JSON.stringify(invalid)), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, version: SNAPSHOT_VERSION })), null);
  const missing = {
    version: NAMED_SNAPSHOT_VERSION,
    boardCode,
    matched: [],
    selection: closed,
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
  assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
});

test('snapshot byte limits count multibyte name bytes', () => {
  const body = encodeSnapshot({ ...createGame(boardCode), name: 'é'.repeat(40) });
  const bytes = new TextEncoder().encode(body).byteLength;
  const padded = body + ' '.repeat(SNAPSHOT_MAX_BYTES - bytes);
  assert.equal(new TextEncoder().encode(padded).byteLength, SNAPSHOT_MAX_BYTES);
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(`${padded} `), null);
});
