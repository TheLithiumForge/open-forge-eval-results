import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('deal names preserve spaces, Unicode and every character except line breaks', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of [
    '',
    '  Café 🎴  ',
    ' ',
    '\t\u0000\u2028\u2029',
    'é'.repeat(40),
    '🎴'.repeat(20),
  ]) {
    assert.equal(isValidDealName(name), true);
    assert.equal(renameGame(createGame(EXAMPLE_CODE), name).name, name);
  }
  for (const name of ['a'.repeat(41), '🎴'.repeat(21), 'line\rbreak', 'line\nbreak'])
    assert.equal(isValidDealName(name), false);
  for (const value of [null, undefined, 1, {}, []]) assert.equal(isValidDealName(value), false);
});

test('renaming preserves progress, rejects invalid changes and clearing makes a game unnamed', () => {
  const initial = createGame(EXAMPLE_CODE);
  assert.equal(initial.name, '');
  const pending = advanceGame(activateCard(activateCard(initial, 0), 1), 175);
  const named = renameGame(pending, '  Café  ');
  assert.deepEqual(named, { ...pending, name: '  Café  ' });
  assert.equal(named.selection, pending.selection);
  assert.equal(named.deck, pending.deck);
  assert.equal(named.matched, pending.matched);
  assert.equal(renameGame(named, named.name), named);
  for (const invalid of ['a'.repeat(41), '\r', '\n'])
    assert.equal(renameGame(named, invalid), named);
  assert.deepEqual(renameGame(named, ''), pending);
  assert.equal(advanceGame(named, 625).name, '  Café  ');
  assert.equal(activateCard(advanceGame(named, 625), 2).name, '  Café  ');
});
