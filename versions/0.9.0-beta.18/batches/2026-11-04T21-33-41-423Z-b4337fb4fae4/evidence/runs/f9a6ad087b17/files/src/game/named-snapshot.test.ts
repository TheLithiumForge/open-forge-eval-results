import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('named snapshots round trip with exact fields regardless of JSON property order', () => {
  const state = { ...createGame(EXAMPLE_CODE), name: ' Café ' };
  const exported: unknown = JSON.parse(encodeSnapshot(state));
  assert.deepEqual(exported, {
    version: 2,
    name: ' Café ',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);

  const reordered = JSON.stringify({
    started: false,
    elapsedMs: 0,
    moves: 0,
    selection: { kind: SelectionKind.closed },
    matched: [],
    boardCode: EXAMPLE_CODE,
    name: ' Café ',
    version: 2,
  });
  assert.equal(decodeSnapshot(reordered)?.name, ' Café ');
  const legacyReordered = JSON.stringify({
    started: false,
    elapsedMs: 0,
    moves: 0,
    selection: { kind: SelectionKind.closed },
    matched: [],
    boardCode: EXAMPLE_CODE,
    version: 1,
  });
  assert.ok(decodeSnapshot(legacyReordered));
});

test('named snapshots reject missing, empty, oversized and multiline names', () => {
  const valid = {
    version: 2,
    name: 'valid',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
  for (const name of ['', 'x'.repeat(41), 'two\nlines', 'two\rlines']) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, name })), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, name: undefined })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...valid, extra: true })), null);
});
