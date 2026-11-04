import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, activateCard, advanceGame } from './game.ts';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';
import { isJsonObject } from './saved-format.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('unnamed progress keeps version one and named progress round trips as version two', () => {
  const unnamed = createGame(EXAMPLE_CODE);
  const plain: unknown = JSON.parse(encodeSnapshot(unnamed));
  assert.ok(isJsonObject(plain));
  assert.equal(plain.version, SNAPSHOT_VERSION);
  assert.equal(Object.hasOwn(plain, 'name'), false);
  assert.equal(decodeSnapshot(encodeSnapshot(unnamed))?.name, '');

  const named = activateCard({ ...unnamed, name: ' Café ' }, 0);
  const exported: unknown = JSON.parse(encodeSnapshot(named));
  assert.ok(isJsonObject(exported));
  assert.equal(exported.version, NAMED_SNAPSHOT_VERSION);
  assert.equal(exported.name, ' Café ');
  assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);
});

test('valid snapshot fields may appear in different orders', () => {
  const versionOne = JSON.stringify({
    started: true,
    boardCode: EXAMPLE_CODE,
    elapsedMs: 0,
    selection: { index: 2, kind: 'one' },
    matched: [],
    moves: 0,
    version: 1,
  });
  const versionTwo = JSON.stringify({
    name: 'saved run',
    started: true,
    selection: { kind: 'one', index: 2 },
    moves: 0,
    version: 2,
    matched: [],
    elapsedMs: 0,
    boardCode: EXAMPLE_CODE,
  });
  assert.equal(decodeSnapshot(versionOne)?.selection.kind, 'one');
  assert.equal(decodeSnapshot(versionTwo)?.name, 'saved run');
  assert.equal(decodeSnapshot(versionTwo)?.selection.kind, 'one');
});

test('version one clears names and both snapshot schemas remain strict', () => {
  const legacy = JSON.stringify({
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: 1,
  });
  const invalid = [
    legacy.replace('"version":1', '"version":1,"extra":true'),
    legacy.replace('"version":1', '"version":1,"name":"wrong version field"'),
    legacy.replace('"version":1', '"version":2'),
    legacy.replace('"version":1', '"version":3'),
  ];
  const named = legacy.replace('"version":1', '"version":2,"name":"saved"');
  invalid.push(
    named.replace(',"name":"saved"', ''),
    named.replace('"name":"saved"', '"name":"saved","extra":true'),
  );
  assert.equal(decodeSnapshot(legacy)?.name, '');
  for (const text of invalid) assert.equal(decodeSnapshot(text), null);
});

test('deal names use the exact UTF-16, empty and line-break rules', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  assert.equal(isValidDealName('x'.repeat(40)), true);
  assert.equal(isValidDealName('🙂'.repeat(20)), true);
  assert.equal(isValidDealName('x'.repeat(41)), false);
  assert.equal(isValidDealName('🙂'.repeat(21)), false);
  assert.equal(isValidDealName(''), false);
  assert.equal(isValidDealName('two\nlines'), false);
  assert.equal(isValidDealName('two\rlines'), false);
  assert.equal(isValidDealName(' \t '), true);
  assert.equal(isValidDealName(null), false);
  assert.equal(isValidDealName(4), false);
  const invalidNames: unknown[] = ['', 4, 'x'.repeat(41), 'two\nlines', 'two\rlines'];
  for (const name of invalidNames) {
    const text = JSON.stringify({
      version: NAMED_SNAPSHOT_VERSION,
      name,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    });
    assert.equal(decodeSnapshot(text), null);
  }
});

test('named snapshots preserve pending mismatch time', () => {
  const start = { ...createGame(EXAMPLE_CODE), name: 'timed run' };
  const first = activateCard(start, 0);
  const mismatch = activateCard(first, 1);
  const pending = advanceGame(mismatch, 175);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(pending)), pending);
});
