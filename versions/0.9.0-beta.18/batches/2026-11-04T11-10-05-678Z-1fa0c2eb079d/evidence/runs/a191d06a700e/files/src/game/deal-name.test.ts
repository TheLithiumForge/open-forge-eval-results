import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('deal names preserve spaces and characters within the UTF-16 limit', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of ['', ' Café ', ' ', '\t\0\u2028\u2029', '\ud800', '🙂'.repeat(20)]) {
    assert.equal(isValidDealName(name), true);
    assert.equal(renameGame(createGame(EXAMPLE_CODE), name).name, name);
  }
  for (const name of ['x'.repeat(41), '🙂'.repeat(20) + 'x', '\r', '\n', 'a\r\nb'])
    assert.equal(isValidDealName(name), false);
  for (const value of [null, undefined, 1, {}, []]) assert.equal(isValidDealName(value), false);
});

test('renaming changes only the name and clearing it makes the game unnamed', () => {
  const initial = createGame(EXAMPLE_CODE);
  assert.equal(initial.name, '');
  const state = advanceGame(activateCard(activateCard(initial, 0), 1), 123.5);
  const named = renameGame(state, ' Café ');
  assert.deepEqual(named, { ...state, name: ' Café ' });
  assert.equal(named.deck, state.deck);
  assert.equal(named.matched, state.matched);
  assert.equal(named.selection, state.selection);
  assert.equal(state.name, '');
  assert.equal(renameGame(named, named.name), named);
  for (const name of ['invalid\nname', 'x'.repeat(41)])
    assert.equal(renameGame(named, name), named);
  assert.deepEqual(renameGame(named, ''), state);
});
