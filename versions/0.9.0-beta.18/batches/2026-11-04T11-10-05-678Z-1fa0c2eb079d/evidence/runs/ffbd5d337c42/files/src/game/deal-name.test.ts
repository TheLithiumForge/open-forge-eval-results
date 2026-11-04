import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('names preserve spaces and Unicode within forty UTF-16 code units', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of [
    '',
    '  Café 😀  ',
    '   ',
    '\t\u2028\u2029',
    'a'.repeat(40),
    '😀'.repeat(20),
  ]) {
    assert.ok(isValidDealName(name));
    assert.equal(renameGame(createGame(EXAMPLE_CODE), name).name, name);
  }
  for (const value of [null, 1, {}, 'a'.repeat(41), '😀'.repeat(21), 'a\rb', 'a\nb', '\r\n'])
    assert.equal(isValidDealName(value), false);
});

test('renaming changes only the name and clearing restores an unnamed game', () => {
  const initial = createGame(EXAMPLE_CODE);
  assert.equal(initial.name, '');
  const pending = advanceGame(activateCard(activateCard(initial, 0), 1), 175.25);
  const named = renameGame(pending, '  Café 😀  ');
  assert.deepEqual(named, { ...pending, name: '  Café 😀  ' });
  assert.equal(named.deck, pending.deck);
  assert.equal(named.matched, pending.matched);
  assert.equal(named.selection, pending.selection);
  assert.equal(renameGame(named, named.name), named);
  assert.equal(renameGame(named, 'invalid\nname'), named);
  assert.equal(renameGame(named, 'a'.repeat(41)), named);
  assert.deepEqual(renameGame(named, ''), pending);
});
