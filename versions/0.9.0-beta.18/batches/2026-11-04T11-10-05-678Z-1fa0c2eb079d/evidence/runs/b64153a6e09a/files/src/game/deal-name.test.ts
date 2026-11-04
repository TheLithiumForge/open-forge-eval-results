import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('deal names retain spaces and Unicode within the UTF-16 limit', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of ['', ' Café ', ' ', '\t', '\u0000', 'a'.repeat(40), '😀'.repeat(20)])
    assert.ok(isValidDealName(name), JSON.stringify(name));
  for (const name of [null, 3, {}, 'a'.repeat(41), '😀'.repeat(21), 'a\nb', 'a\rb'])
    assert.equal(isValidDealName(name), false, JSON.stringify(name));
});

test('renaming changes only the name and clearing restores unnamed progress', () => {
  const state = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 125);
  assert.equal(state.name, '');
  const named = renameGame(state, ' Café ');
  assert.deepEqual(named, { ...state, name: ' Café ' });
  assert.equal(named.deck, state.deck);
  assert.equal(named.selection, state.selection);
  assert.equal(named.matched, state.matched);
  assert.equal(renameGame(named, named.name), named);
  assert.equal(renameGame(named, 'bad\nname'), named);
  assert.equal(renameGame(named, 'a'.repeat(41)), named);
  assert.deepEqual(renameGame(named, ''), state);
  assert.equal(createGame(named.boardCode).name, '');
});

test('card actions and active time preserve a deal name', () => {
  const named = renameGame(createGame(EXAMPLE_CODE), 'Memory');
  const first = activateCard(named, 0);
  const mismatch = activateCard(first, 1);
  const closed = advanceGame(mismatch, 800);
  const match = activateCard(activateCard(closed, 2), 6);
  for (const state of [first, mismatch, closed, match]) assert.equal(state.name, named.name);
});
