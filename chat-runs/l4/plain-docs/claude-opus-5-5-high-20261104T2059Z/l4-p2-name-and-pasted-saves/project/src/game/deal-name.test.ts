import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { DEAL_NAME_MAX_LENGTH, isDealName, renameGame } from './deal-name.ts';
import { EXAMPLE_CODE, SPEC_VECTOR } from './game.fixture.ts';

test('a new deal starts unnamed', () => {
  assert.equal(createGame(EXAMPLE_CODE).name, '');
});

test('deal names allow 40 code units and no line breaks', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, SPEC_VECTOR.dealNameLength);
  for (const name of ['', ' x ', 'x'.repeat(DEAL_NAME_MAX_LENGTH), '\u{1F0CF}'.repeat(20)])
    assert.equal(isDealName(name), true, name);
  for (const name of ['x'.repeat(DEAL_NAME_MAX_LENGTH + 1), '\u{1F0CF}'.repeat(21), 'a\nb', 'a\r'])
    assert.equal(isDealName(name), false, name);
  assert.equal(isDealName(1), false);
});

test('renaming keeps the deal, cards, moves and clock and clearing makes it unnamed', () => {
  const state = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 100);
  const named = renameGame(state, ' Night run ');
  assert.deepEqual(named, { ...state, name: ' Night run ' });
  assert.deepEqual(renameGame(named, ''), state);
  assert.equal(renameGame(named, 'a\nb'), named, 'invalid names change nothing');
  assert.equal(renameGame(named, ' Night run '), named, 'the same name keeps the state');
  assert.equal(activateCard(named, 2).name, ' Night run ', 'play keeps the name');
});
