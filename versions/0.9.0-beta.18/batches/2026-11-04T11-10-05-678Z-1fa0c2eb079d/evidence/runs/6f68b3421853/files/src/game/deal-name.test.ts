import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, activateCard, advanceGame } from './game.ts';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

test('deal names preserve spaces and Unicode within forty UTF-16 code units', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of [
    '',
    ' ',
    '  Café  ',
    '\t\u0000\u2028\u2029',
    'x'.repeat(40),
    '😀'.repeat(20),
  ]) {
    assert.equal(isValidDealName(name), true);
    assert.equal(renameGame(createGame(EXAMPLE_CODE), name).name, name);
  }
  for (const name of ['x'.repeat(41), '😀'.repeat(21), 'a\rb', 'a\nb', '\r\n']) {
    const state = renameGame(createGame(EXAMPLE_CODE), 'Original');
    assert.equal(isValidDealName(name), false);
    assert.equal(renameGame(state, name), state);
  }
  for (const value of [null, undefined, 1, true, [], {}])
    assert.equal(isValidDealName(value), false);
});

test('naming and clearing progress change only its name throughout play', () => {
  const initial = createGame(EXAMPLE_CODE);
  assert.equal(initial.name, '');
  const first = activateCard(initial, 0);
  const pending = advanceGame(activateCard(first, 1), 0.75);
  let completed = initial;
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) completed = activateCard(completed, index);
  for (const state of [initial, first, pending, completed]) {
    const named = renameGame(state, '  Café  ');
    assert.deepEqual(named, { ...state, name: '  Café  ' });
    assert.equal(state.name, '');
    assert.equal(renameGame(named, named.name), named);
    assert.deepEqual(renameGame(named, ''), state);
  }
});

test('card actions and active time retain the deal name', () => {
  const named = renameGame(createGame(EXAMPLE_CODE), 'Café');
  const first = activateCard(named, 0);
  const mismatch = activateCard(first, 1);
  const elapsed = advanceGame(mismatch, 800);
  const match = activateCard(activateCard(elapsed, 2), 6);
  for (const state of [first, mismatch, elapsed, match]) assert.equal(state.name, 'Café');
});
