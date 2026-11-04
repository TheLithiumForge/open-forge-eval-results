import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';
import { activateCard, advanceGame, createGame, isWon } from './game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';
import { replayGame } from './replay.ts';
import { SelectionKind } from './selection.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_VERSION,
} from './snapshot.ts';

const UNNAMED = {
  version: SNAPSHOT_VERSION,
  boardCode: EXAMPLE_CODE,
  matched: [0, 11],
  selection: { kind: SelectionKind.mismatch, first: 1, second: 2, remainingMs: 300 },
  moves: 2,
  elapsedMs: 1500,
  started: true,
};
const NAMED = { ...UNNAMED, version: NAMED_SNAPSHOT_VERSION, name: 'Café' };

test('snapshot field order leaves both formats and nested selections unchanged', () => {
  for (const snapshot of [UNNAMED, NAMED]) {
    const expected = decodeSnapshot(JSON.stringify(snapshot));
    assert.ok(expected);
    const entries = Object.entries(snapshot);
    for (let offset = 1; offset < entries.length; offset++) {
      const reordered = Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]);
      reordered.selection = { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' };
      assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), expected);
    }
  }
  const one =
    '{"started":true,"selection":{"index":2,"kind":"one"},"elapsedMs":0,"moves":0,"matched":[],"boardCode":"np1-4-1","name":"Café","version":2}';
  assert.equal(decodeSnapshot(one)?.name, 'Café');
});

test('named snapshots preserve names and progress while unnamed exports retain their schema', () => {
  const progress = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
  assert.equal(createGame(EXAMPLE_CODE).name, '');
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  const names = ['Café', '  Café  ', ' ', 'x'.repeat(40), '🙂'.repeat(20), 'a\t\0\u2028b'];
  for (const name of names) {
    const named = { ...progress, name };
    const text = encodeSnapshot(named);
    assert.equal(isValidDealName(name), true);
    assert.deepEqual(decodeSnapshot(text), named);
    const exported: unknown = JSON.parse(text);
    assert.deepEqual(exported, {
      version: 2,
      name,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 625 },
      moves: 1,
      elapsedMs: 175,
      started: true,
    });
    assert.ok(exported && typeof exported === 'object');
    assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS, 'name'].sort());
  }
  const cleared = { ...progress, name: '' };
  assert.deepEqual(decodeSnapshot(encodeSnapshot(cleared)), cleared);
  const unnamed: unknown = JSON.parse(encodeSnapshot(cleared));
  assert.ok(unnamed && typeof unnamed === 'object');
  assert.deepEqual(Object.keys(unnamed).sort(), [...SNAPSHOT_KEYS].sort());
  assert.equal(decodeSnapshot(JSON.stringify(UNNAMED))?.name, '');
});

test('named progress rejects invalid names and each version enforces its exact fields', () => {
  assert.ok(decodeSnapshot(JSON.stringify(NAMED)), 'valid named baseline');
  assert.equal(isValidDealName(''), true, 'clearing a name is allowed in game state');
  const invalidNames: readonly unknown[] = [
    '',
    null,
    false,
    1,
    [],
    {},
    'a'.repeat(41),
    '🙂'.repeat(20) + 'a',
    '\r',
    '\n',
    'a\r\nb',
  ];
  for (const name of invalidNames) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
    if (name !== '') assert.equal(isValidDealName(name), false);
  }
  for (const version of [0, 3, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, name: '' })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, name: 'Café' })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, version: 2 })), null);
  for (const snapshot of [UNNAMED, NAMED]) {
    assert.equal(decodeSnapshot(JSON.stringify({ extra: true, ...snapshot })), null);
    for (const key of Object.keys(snapshot)) {
      const missing = Object.fromEntries(
        Object.entries(snapshot).filter(([field]) => field !== key),
      );
      assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
    }
  }
});

test('named snapshots keep state validation and count UTF-8 bytes at the import boundary', () => {
  for (const overrides of [
    { matched: [0] },
    { moves: 0 },
    { started: false },
    { selection: { ...NAMED.selection, remainingMs: 0 } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...overrides })), null);
  const text = JSON.stringify(NAMED);
  assert.ok(Buffer.byteLength(text) > text.length);
  const boundary = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.ok(decodeSnapshot(boundary));
  assert.equal(decodeSnapshot(boundary + ' '), null);
});

test('named games retain their name through play and completion while replay stays unnamed', () => {
  let game = { ...createGame(EXAMPLE_CODE), name: 'Café' };
  for (const pair of EXAMPLE_PAIRS) {
    for (const index of pair) game = activateCard(game, index);
    game = advanceGame(game, 10);
  }
  assert.equal(isWon(game), true);
  assert.equal(game.name, 'Café');
  const completed = decodeSnapshot(encodeSnapshot(game));
  assert.ok(completed && isWon(completed));
  assert.equal(completed.name, 'Café');
  const replay = replayGame(
    JSON.stringify({ version: 1, boardCode: EXAMPLE_CODE, actions: [], endMs: 0 }),
  );
  assert.ok(replay);
  assert.equal(replay.name, '');
  assert.deepEqual(JSON.parse(encodeSnapshot(replay)), {
    version: 1,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
});
