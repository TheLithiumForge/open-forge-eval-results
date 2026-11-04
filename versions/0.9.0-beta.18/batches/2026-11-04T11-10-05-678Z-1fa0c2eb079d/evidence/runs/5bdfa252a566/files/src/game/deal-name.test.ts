import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

test('deal names preserve spaces and Unicode with a limit measured in UTF-16 code units', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of [
    '',
    ' ',
    '  Café 🎲  ',
    '\u0000\u2028\u2029',
    'a'.repeat(40),
    '🎲'.repeat(20),
  ]) {
    assert.equal(isValidDealName(name), true);
    assert.equal(renameGame(createGame(EXAMPLE_CODE), name).name, name);
  }
  for (const name of ['a'.repeat(41), '🎲'.repeat(21), '\r', '\n', 'a\r\nb'])
    assert.equal(isValidDealName(name), false);
  for (const value of [null, undefined, 12, {}, []]) assert.equal(isValidDealName(value), false);
});

test('naming changes only the name and clearing returns the game to unnamed progress', () => {
  const initial = createGame(EXAMPLE_CODE);
  assert.equal(initial.name, '');
  const pending = advanceGame(activateCard(activateCard(initial, 0), 1), 123.5);
  const named = renameGame(pending, '  Café 🎲  ');
  assert.deepEqual(named, { ...pending, name: '  Café 🎲  ' });
  assert.equal(named.deck, pending.deck);
  assert.equal(named.matched, pending.matched);
  assert.equal(named.selection, pending.selection);
  assert.equal(pending.name, '');
  assert.equal(renameGame(named, named.name), named);
  for (const invalid of ['a'.repeat(41), 'line\rbreak', 'line\nbreak'])
    assert.equal(renameGame(named, invalid), named);
  assert.deepEqual(renameGame(named, ''), pending);
});

test('play and completion retain the name while a new game starts unnamed', () => {
  let state = renameGame(createGame(EXAMPLE_CODE), 'finished');
  for (const [first, second] of EXAMPLE_PAIRS)
    state = activateCard(advanceGame(activateCard(state, first), 10), second);
  assert.equal(state.name, 'finished');
  assert.equal(renameGame(state, 'renamed after completion').name, 'renamed after completion');
  assert.equal(createGame(state.boardCode).name, '');
});
