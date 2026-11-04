import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('named progress exports version 2 and restores its name', () => {
  const name = '  Café 🎲  ';
  const state = { ...createGame(EXAMPLE_CODE), name };
  const encoded: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(encoded && typeof encoded === 'object');
  assert.deepEqual(Object.keys(encoded).sort(), [...NAMED_SNAPSHOT_KEYS].sort());
  assert.equal('version' in encoded && encoded.version, NAMED_SNAPSHOT_VERSION);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
});

test('version 1 and version 2 snapshots accept property order from pasted JSON', () => {
  const unnamed =
    '{"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true,"version":1}';
  assert.equal(decodeSnapshot(unnamed)?.name, '');
  const named =
    '{"name":"Café","boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":2},"moves":0,"elapsedMs":0,"started":true,"version":2}';
  assert.equal(decodeSnapshot(named)?.name, 'Café');
});

test('deal names preserve spaces and accept exactly 40 UTF-16 code units', () => {
  const maximumAscii = 'x'.repeat(40);
  const maximumAstral = '😀'.repeat(20);
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  assert.equal(isValidDealName(maximumAscii), true);
  assert.equal(decodeSnapshot(named(maximumAscii))?.name, maximumAscii);
  assert.equal(maximumAstral.length, 40);
  assert.equal(decodeSnapshot(named(maximumAstral))?.name, maximumAstral);
  assert.equal(isValidDealName(' café '), true);
  assert.equal(isValidDealName('x'.repeat(41)), false);
  assert.equal(isValidDealName('😀'.repeat(21)), false);
  assert.equal(decodeSnapshot(named('😀'.repeat(21))), null);
  assert.equal(isValidDealName('line\nfeed'), false);
  assert.equal(decodeSnapshot(named('line\nfeed')), null);
  assert.equal(isValidDealName('carriage\rreturn'), false);
  assert.equal(decodeSnapshot(named('carriage\rreturn')), null);
  assert.equal(decodeSnapshot(named('')), null, 'version 2 requires a nonempty name');
  assert.equal(decodeSnapshot(namedValue(42)), null, 'name must be a string');
});

test('snapshot versions reject mixed fields, unknown fields, and missing fields', () => {
  const valid = {
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Run',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'one', index: 2 },
    moves: 0,
    elapsedMs: 0,
    started: true,
  };
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, extra: true })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, version: 3 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, version: 1 })), null);
  const { name: _name, ...withoutName } = valid;
  assert.equal(decodeSnapshot(JSON.stringify(withoutName)), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, name: undefined })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, version: 1, name: 'Run' })), null);
});

test('named snapshots enforce the UTF-8 byte limit', () => {
  const text = named(' Café ');
  const padding = SNAPSHOT_MAX_BYTES - new TextEncoder().encode(text).byteLength;
  assert.ok(padding > 0);
  assert.ok(decodeSnapshot(text + ' '.repeat(padding)));
  assert.equal(decodeSnapshot(text + ' '.repeat(padding + 1)), null);
});

function named(name: string): string {
  return namedValue(name);
}

function namedValue(name: unknown): string {
  return JSON.stringify({
    version: NAMED_SNAPSHOT_VERSION,
    name,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'one', index: 2 },
    moves: 0,
    elapsedMs: 0,
    started: true,
  });
}
