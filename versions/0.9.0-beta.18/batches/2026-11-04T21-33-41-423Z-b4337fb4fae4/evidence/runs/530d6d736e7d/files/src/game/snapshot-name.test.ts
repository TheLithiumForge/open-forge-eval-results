import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from './game.ts';
import { isJsonObject } from './saved-format.ts';
import { decodeSnapshot, encodeSnapshot, isValidDealName } from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('named snapshots preserve names and unnamed snapshots keep version one', () => {
  const name = '  Café  ';
  const named = { ...createGame(EXAMPLE_CODE), name };
  const exported: unknown = JSON.parse(encodeSnapshot(named));
  assert.ok(isJsonObject(exported));
  assert.equal(exported.version, 2);
  assert.equal(exported.name, name);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);

  const unnamed = createGame(EXAMPLE_CODE);
  const legacy: unknown = JSON.parse(encodeSnapshot(unnamed));
  assert.ok(isJsonObject(legacy));
  assert.equal(legacy.version, 1);
  assert.equal(Object.hasOwn(legacy, 'name'), false);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(unnamed)), unnamed);
});

test('snapshot imports accept reordered keys and validate names in UTF-16 code units', () => {
  const reordered = JSON.stringify({
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
    name: 'Pasted deal',
    version: 2,
  });
  assert.equal(decodeSnapshot(reordered)?.name, 'Pasted deal');

  const legacy = JSON.stringify({
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: 1,
  });
  assert.equal(decodeSnapshot(legacy)?.name, '');

  assert.equal(isValidDealName('🪴'.repeat(20)), true);
  for (const name of ['', '🪴'.repeat(21), 'first\nsecond', 'first\rsecond'])
    assert.equal(
      decodeSnapshot(
        JSON.stringify({
          version: 2,
          name,
          boardCode: EXAMPLE_CODE,
          matched: [],
          selection: { kind: SelectionKind.closed },
          moves: 0,
          elapsedMs: 0,
          started: false,
        }),
      ),
      null,
    );
});
