import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import { isJsonObject } from './saved-format.ts';
import { SelectionKind } from './selection.ts';
import {
  decodeSnapshot,
  decodeSnapshotData,
  encodeSnapshot,
  isValidDealName,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('snapshot imports accept reordered properties and still reject unknown keys', () => {
  const reordered = JSON.stringify({
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: SNAPSHOT_VERSION,
  });
  assert.ok(decodeSnapshot(reordered));
  assert.equal(decodeSnapshot(`${reordered.slice(0, -1)},"extra":true}`), null);
});

test('named snapshots round trip names and accept reordered pasted properties', () => {
  const state = activateCard(createGame(EXAMPLE_CODE), 0);
  const name = '  Café 🃏  ';
  const text = encodeSnapshot(state, name);
  const exported: unknown = JSON.parse(text);
  if (!isJsonObject(exported)) throw new Error('Expected a snapshot object.');
  assert.deepEqual(Object.keys(exported).sort(), [...NAMED_SNAPSHOT_KEYS].sort());
  assert.equal(exported.version, NAMED_SNAPSHOT_VERSION);
  assert.equal(exported.name, name);
  assert.deepEqual(decodeSnapshotData(text), { game: state, name });

  const pasted = JSON.stringify({
    boardCode: exported.boardCode,
    matched: exported.matched,
    selection: exported.selection,
    moves: exported.moves,
    elapsedMs: exported.elapsedMs,
    started: exported.started,
    name: exported.name,
    version: exported.version,
  });
  assert.deepEqual(decodeSnapshotData(pasted), { game: state, name });
  assert.equal(decodeSnapshotData(encodeSnapshot(createGame(EXAMPLE_CODE)))?.name, '');
});

test('deal names allow 40 UTF-16 code units and reject empty imported names and line breaks', () => {
  assert.equal(isValidDealName(''), true);
  assert.equal(isValidDealName('  kept  '), true);
  assert.equal(isValidDealName('🃏'.repeat(20)), true);
  assert.equal(isValidDealName('🃏'.repeat(21)), false);
  for (const name of ['', 'x'.repeat(41), 'bad\rname', 'bad\nname']) {
    const text = JSON.stringify({
      version: NAMED_SNAPSHOT_VERSION,
      name,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: SelectionKind.one, index: 0 },
      moves: 0,
      elapsedMs: 0,
      started: true,
    });
    assert.equal(decodeSnapshotData(text), null);
  }
});
