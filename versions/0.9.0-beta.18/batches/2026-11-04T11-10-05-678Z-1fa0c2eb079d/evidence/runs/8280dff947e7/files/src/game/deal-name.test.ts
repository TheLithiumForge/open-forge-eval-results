import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('deal names allow empty text, spaces and Unicode within forty UTF-16 code units', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const value of ['', ' ', ' Café ', 'a'.repeat(40), '😀'.repeat(20), '\tCafé\u2028'])
    assert.equal(isValidDealName(value), true, JSON.stringify(value));
  for (const value of [undefined, null, 1, [], {}, 'a'.repeat(41), '😀'.repeat(20) + 'a'])
    assert.equal(isValidDealName(value), false, JSON.stringify(value));
});

test('deal names reject carriage returns and line feeds wherever they occur', () => {
  for (const value of ['\r', '\n', '\rCafé', 'Café\n', 'Ca\r\nfé'])
    assert.equal(isValidDealName(value), false);
});

test('fresh games are unnamed and card actions and active time preserve their name', () => {
  const initial = createGame(EXAMPLE_CODE);
  assert.equal(initial.name, '');
  const named = { ...initial, name: ' Café ' };
  const pending = activateCard(activateCard(named, 0), 1);
  const closed = advanceGame(pending, 800);
  const matched = activateCard(activateCard(closed, 2), 6);
  for (const state of [pending, closed, matched]) assert.equal(state.name, named.name);
  assert.equal(initial.name, '');
});
