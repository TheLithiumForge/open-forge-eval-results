import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, activateCard, advanceGame } from './game.ts';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

function plainSnapshot(): Record<string, unknown> {
  return {
    version: SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}

test('v1 pasted snapshots accept reordered keys and clear the deal name', () => {
  const reordered = JSON.stringify(Object.fromEntries(Object.entries(plainSnapshot()).reverse()));
  assert.equal(decodeSnapshot(reordered)?.name, '');
});

test('named snapshots round trip the full name and retain it through game transitions', () => {
  const name = '  Café ✨ : hello\tworld  ';
  const named = { ...createGame(EXAMPLE_CODE), name };
  const revealed = activateCard(named, 0);
  const progressing = advanceGame(revealed, 25);
  const json = encodeSnapshot(progressing);
  const exported: unknown = JSON.parse(json);
  assert.deepEqual(exported, {
    version: NAMED_SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'one', index: 0 },
    moves: 0,
    elapsedMs: 25,
    started: true,
    name,
  });
  assert.equal(decodeSnapshot(json)?.name, name);
  const reordered = JSON.stringify(Object.fromEntries(Object.entries(exported).reverse()));
  assert.equal(decodeSnapshot(reordered)?.name, name);
});

test('snapshot decoding rejects unsupported versions and invalid names', () => {
  for (const invalid of [
    { ...plainSnapshot(), name: 'unexpected' },
    { ...plainSnapshot(), version: NAMED_SNAPSHOT_VERSION },
    { ...plainSnapshot(), version: NAMED_SNAPSHOT_VERSION, name: '' },
    { ...plainSnapshot(), version: NAMED_SNAPSHOT_VERSION, name: null },
    { ...plainSnapshot(), version: NAMED_SNAPSHOT_VERSION, name: 42 },
    { ...plainSnapshot(), version: NAMED_SNAPSHOT_VERSION, name: 'x'.repeat(41) },
    { ...plainSnapshot(), version: NAMED_SNAPSHOT_VERSION, name: 'line\rreturn' },
    { ...plainSnapshot(), version: NAMED_SNAPSHOT_VERSION, name: 'line\nfeed' },
    { ...plainSnapshot(), version: 3, name: 'future' },
  ])
    assert.equal(decodeSnapshot(JSON.stringify(invalid)), null);
});

test('snapshot decoding preserves whitespace and accepts exactly 40 UTF-16 units', () => {
  const name = ' '.repeat(DEAL_NAME_MAX_LENGTH);
  const named = { ...plainSnapshot(), version: NAMED_SNAPSHOT_VERSION, name };
  assert.equal(decodeSnapshot(JSON.stringify(named))?.name, name);
});

test('deal names use UTF-16 length and preserve spaces and allowed characters', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  assert.ok(isValidDealName(''));
  assert.ok(isValidDealName('  Café\t✨  '));
  assert.ok(isValidDealName('😀'.repeat(20)));
  assert.equal(isValidDealName('😀'.repeat(21)), false);
  assert.equal(isValidDealName('line\rreturn'), false);
  assert.equal(isValidDealName('line\nfeed'), false);
  assert.equal(isValidDealName(null), false);
});
