import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';

test('deal names preserve spaces, Unicode and every character except line breaks', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of ['', '  Café 😀  ', ' ', '\t', '\u0000', '\u2028\u2029', '<>&"']) {
    assert.equal(isValidDealName(name), true);
    assert.equal(renameGame(createGame('np1-4-1'), name).name, name);
  }
  for (const name of ['a\nb', 'a\rb', '\r\n', 'a'.repeat(41), '😀'.repeat(21)]) {
    assert.equal(isValidDealName(name), false);
  }
  for (const value of [null, undefined, 1, {}, [], false]) {
    assert.equal(isValidDealName(value), false);
  }
});

test('the name limit counts UTF-16 code units, including surrogate pairs', () => {
  for (const name of ['a'.repeat(40), '😀'.repeat(20), '😀'.repeat(19) + 'ab']) {
    assert.equal(isValidDealName(name), true);
    assert.equal(renameGame(createGame('np1-4-1'), name).name, name);
    assert.equal(isValidDealName(name + 'x'), false);
  }
});

test('renaming changes only the name and invalid edits keep the original state', () => {
  const state = advanceGame(activateCard(activateCard(createGame('np1-4-1'), 0), 1), 100.5);
  assert.equal(state.name, '');
  const named = renameGame(state, '  Café  ');
  assert.deepEqual(named, { ...state, name: '  Café  ' });
  assert.equal(named.deck, state.deck);
  assert.equal(named.matched, state.matched);
  assert.equal(named.selection, state.selection);
  assert.equal(renameGame(named, named.name), named);
  for (const name of ['a\nb', 'a\rb', 'x'.repeat(41)]) {
    assert.equal(renameGame(named, name), named);
  }
  assert.deepEqual(renameGame(named, ''), state);
});

test('play preserves a deal name and a newly created deal starts unnamed', () => {
  const named = renameGame(createGame('np1-4-1'), 'Café');
  const first = activateCard(named, 0);
  const mismatch = activateCard(first, 1);
  const closed = advanceGame(mismatch, 800);
  const matched = activateCard(activateCard(closed, 0), 11);
  for (const state of [first, mismatch, closed, matched]) assert.equal(state.name, 'Café');
  assert.equal(createGame(named.boardCode).name, '');
});
