import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame, isWon } from './game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

test('deal names preserve surrounding spaces and count UTF-16 code units', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  assert.equal(createGame(EXAMPLE_CODE).name, '');
  for (const name of ['', ' ', '  Café  ', '\t雪\u0000', 'x'.repeat(40), '🎮'.repeat(20)]) {
    assert.ok(isValidDealName(name));
    assert.equal(renameGame(createGame(EXAMPLE_CODE), name).name, name);
  }
  for (const name of [null, 1, {}, 'x'.repeat(41), '🎮'.repeat(21), '\r', '\n', 'A\r\nB'])
    assert.equal(isValidDealName(name), false);
});

test('renaming changes only the name and invalid or repeated edits leave state unchanged', () => {
  const pending = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 123.5);
  const named = renameGame(pending, '  Café  ');
  assert.deepEqual(named, { ...pending, name: '  Café  ' });
  assert.equal(named.deck, pending.deck);
  assert.equal(named.selection, pending.selection);
  assert.equal(named.matched, pending.matched);
  assert.equal(pending.name, '');
  assert.equal(renameGame(named, named.name), named);
  for (const name of ['x'.repeat(41), 'A\rB', 'A\nB']) assert.equal(renameGame(named, name), named);
  assert.deepEqual(renameGame(named, ''), pending);
});

test('play and logical time preserve names through a mismatch, a match and completion', () => {
  let state = renameGame(createGame(EXAMPLE_CODE), 'Café');
  state = activateCard(activateCard(state, 0), 1);
  assert.equal(state.name, 'Café');
  state = advanceGame(state, 800);
  assert.equal(state.name, 'Café');
  for (const pair of EXAMPLE_PAIRS) {
    for (const index of pair) state = activateCard(state, index);
    assert.equal(state.name, 'Café');
  }
  assert.ok(isWon(state));
  const renamed = renameGame(state, 'Finished');
  assert.deepEqual(renamed, { ...state, name: 'Finished' });
  assert.equal(advanceGame(renamed, 1000), renamed);
});
