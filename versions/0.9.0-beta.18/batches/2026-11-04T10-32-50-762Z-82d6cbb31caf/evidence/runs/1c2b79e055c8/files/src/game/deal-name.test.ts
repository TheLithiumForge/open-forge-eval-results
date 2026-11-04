import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { decodeSnapshot, encodeSnapshot, NAMED_SNAPSHOT_VERSION } from './snapshot.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

const INITIAL = createGame(EXAMPLE_CODE);
const ONE = activateCard(INITIAL, 0);
const MISMATCH = advanceGame(activateCard(ONE, 1), 500);
let completed = INITIAL;
for (const pair of EXAMPLE_PAIRS)
  for (const index of pair) completed = activateCard(completed, index);

test('naming a game changes only its name and clearing it restores unnamed progress', () => {
  assert.equal(INITIAL.name, '');
  for (const state of [INITIAL, ONE, MISMATCH, completed]) {
    const named = renameGame(state, '  Café 😀  ');
    assert.deepEqual(named, { ...state, name: '  Café 😀  ' });
    assert.equal(named.deck, state.deck);
    assert.equal(named.selection, state.selection);
    assert.equal(named.matched, state.matched);
    assert.equal(state.name, '');
    assert.equal(renameGame(named, named.name), named);
    assert.deepEqual(renameGame(named, ''), state);
  }
});

test('names count UTF-16 units, reject line endings and preserve all other characters', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of ['', ' ', '  Café  ', '\t<>"&\u0000', 'x'.repeat(40), '😀'.repeat(20)]) {
    assert.equal(isValidDealName(name), true);
    assert.equal(renameGame(INITIAL, name).name, name);
  }
  for (const name of ['x'.repeat(41), '😀'.repeat(20) + 'x', '\r', '\n', 'a\r\nb']) {
    assert.equal(isValidDealName(name), false);
    assert.equal(renameGame(MISMATCH, name), MISMATCH);
  }
  for (const value of [null, undefined, 40, {}, []]) assert.equal(isValidDealName(value), false);
});

test('named and unnamed games round trip using their exact versioned snapshot fields', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  for (const state of [INITIAL, ONE, MISMATCH, completed])
    for (const name of ['', ' ', '  Café 😀  ', '\t<>"&\u0000', 'x'.repeat(40), '😀'.repeat(20)]) {
      const game = renameGame(state, name);
      const text = encodeSnapshot(game);
      const fields = [
        'version',
        'boardCode',
        'matched',
        'selection',
        'moves',
        'elapsedMs',
        'started',
      ];
      const value: unknown = JSON.parse(text);
      assert.ok(value && typeof value === 'object');
      assert.deepEqual(Object.keys(value).sort(), [...fields, ...(name ? ['name'] : [])].sort());
      assert.deepEqual(decodeSnapshot(text), {
        ...game,
        matched: [...game.matched].sort((left, right) => left - right),
      });
      assert.match(text, name ? /"version": 2/ : /"version": 1/);
    }
});

test('named snapshots count UTF-8 bytes including non-ASCII names', () => {
  const text = encodeSnapshot(renameGame(MISMATCH, '😀'.repeat(20)));
  const padded = text + ' '.repeat(65_536 - Buffer.byteLength(text));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});

test('named exports retain whole milliseconds for a nearly closed mismatch', () => {
  const state = renameGame(advanceGame(MISMATCH, 299.75), 'Café');
  const restored = decodeSnapshot(encodeSnapshot(state));
  assert.ok(restored);
  assert.equal(restored.name, 'Café');
  assert.equal(restored.elapsedMs, 799);
  assert.deepEqual(restored.selection, { kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
});
