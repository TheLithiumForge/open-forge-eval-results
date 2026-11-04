import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { isValidDealName, renameGame } from './deal-name.ts';

test('names preserve spaces, Unicode and other characters within forty UTF-16 units', () => {
  const state = advanceGame(activateCard(activateCard(createGame('np1-4-1'), 0), 1), 175);
  for (const name of ['Café', '  Café 🃏  ', ' ', '🃏'.repeat(20), 'a'.repeat(40), '\t<>"\\']) {
    assert.equal(isValidDealName(name), true);
    const named = renameGame(state, name);
    assert.deepEqual(named, { ...state, name });
    assert.equal(named.deck, state.deck);
    assert.equal(named.selection, state.selection);
    assert.equal(named.matched, state.matched);
    assert.equal(renameGame(named, name), named);
    assert.deepEqual(renameGame(named, ''), state);
  }
  assert.equal(state.name, '');
});

test('invalid names leave existing progress and its name intact', () => {
  const state = renameGame(createGame('np1-4-1'), 'Keep me');
  for (const name of ['a'.repeat(41), '🃏'.repeat(21), '\r', '\n', 'a\r\nb']) {
    assert.equal(isValidDealName(name), false);
    assert.equal(renameGame(state, name), state);
  }
  for (const value of [null, undefined, [], {}, 4]) assert.equal(isValidDealName(value), false);
});
