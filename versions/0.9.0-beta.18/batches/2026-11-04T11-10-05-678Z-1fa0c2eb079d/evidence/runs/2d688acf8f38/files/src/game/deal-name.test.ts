import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';
import { createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_KEYS } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('deal names preserve allowed text and enforce the UTF-16 line rules', () => {
  assert.ok(isValidDealName(''), 'empty name clears the name');
  assert.ok(isValidDealName('  Café ☕  '), 'spaces and Unicode are preserved');
  assert.ok(
    isValidDealName('Friday run \\ notes'),
    'ordinary letters and backslashes remain valid',
  );
  assert.ok(isValidDealName('😀'.repeat(DEAL_NAME_MAX_LENGTH / 2)), 'surrogate pairs count twice');
  assert.equal(isValidDealName('x'.repeat(DEAL_NAME_MAX_LENGTH + 1)), false);
  assert.equal(isValidDealName('line\nbreak'), false);
  assert.equal(isValidDealName('line\rbreak'), false);
});

test('named exports use version 2 and restore their exact names', () => {
  const state = { ...createGame(EXAMPLE_CODE), name: '  Café ☕  ' };
  const value: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(value && typeof value === 'object');
  assert.equal(Reflect.get(value, 'version'), 2);
  assert.equal(Reflect.get(value, 'name'), state.name);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
});

test('unnamed exports retain the exact version 1 shape and imports clear names', () => {
  const exported: unknown = JSON.parse(encodeSnapshot(createGame(EXAMPLE_CODE)));
  assert.ok(exported && typeof exported === 'object');
  assert.equal(Reflect.get(exported, 'version'), 1);
  assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS].sort());
  assert.equal(decodeSnapshot(reorderedUnnamed())?.name, '');
});

test('snapshot imports accept fields regardless of order in both versions', () => {
  assert.equal(decodeSnapshot(reorderedUnnamed())?.selection.kind, 'one');
  assert.equal(decodeSnapshot(reorderedNamed())?.name, 'Café');
});

test('version 2 snapshots reject empty, oversized and line-broken names', () => {
  for (const name of ['', 'x'.repeat(DEAL_NAME_MAX_LENGTH + 1), 'bad\nname', 'bad\rname']) {
    const text = JSON.stringify({
      version: 2,
      name,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    });
    assert.equal(decodeSnapshot(text), null, 'rejects an invalid name');
  }
  assert.equal(decodeSnapshot(reorderedUnnamed().replace('"version":1', '"version":3')), null);
});

function reorderedUnnamed(): string {
  return '{"boardCode":"np1-4-1","matched":[],"selection":{"index":2,"kind":"one"},"moves":0,"elapsedMs":0,"started":true,"version":1}';
}

function reorderedNamed(): string {
  return '{"name":"Café","boardCode":"np1-4-1","matched":[],"selection":{"index":2,"kind":"one"},"moves":0,"elapsedMs":0,"started":true,"version":2}';
}
