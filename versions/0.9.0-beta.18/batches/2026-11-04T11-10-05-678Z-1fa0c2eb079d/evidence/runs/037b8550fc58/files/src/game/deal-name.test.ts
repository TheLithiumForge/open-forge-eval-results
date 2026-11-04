import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';
import { nameGame, createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('deal names count UTF-16 code units and keep spaces and other characters', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  assert.equal(isValidDealName('😀'.repeat(20)), true);
  assert.equal(isValidDealName('😀'.repeat(21)), false);
  assert.equal(isValidDealName('  Café / game  '), true);
  assert.equal(isValidDealName(''), true);
  for (const name of ['x'.repeat(41), 'line\nbreak', 'line\rbreak', 'line\r\nbreak', 5])
    assert.equal(isValidDealName(name), false);
});

test('changing a deal name changes only that field and clearing restores unnamed state', () => {
  const game = createGame(EXAMPLE_CODE);
  const named = nameGame(game, '  Café  ');
  assert.deepEqual({ ...named, name: '' }, game);
  assert.equal(named.name, '  Café  ');
  assert.deepEqual(nameGame(named, ''), game);
  for (const name of ['x'.repeat(41), 'x\ny', 'x\ry']) assert.equal(nameGame(game, name), game);
});
