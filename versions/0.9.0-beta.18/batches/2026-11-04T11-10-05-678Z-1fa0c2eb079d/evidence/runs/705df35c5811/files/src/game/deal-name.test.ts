import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame, isWon, MISMATCH_MS } from './game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

test('deal names preserve spaces and characters within forty UTF-16 code units', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of ['', ' ', '  Café\t🎴  ', '\u2028', 'x'.repeat(40), '🎴'.repeat(20)]) {
    assert.equal(isValidDealName(name), true);
    assert.equal(renameGame(createGame(EXAMPLE_CODE), name).name, name);
  }
  for (const value of [null, false, 0, {}, [], 'x'.repeat(41), '🎴'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(isValidDealName(value), false);
});

test('renaming changes only the name and accepts clearing an existing name', () => {
  const original = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
  const named = renameGame(original, '  Café  ');
  assert.deepEqual(named, { ...original, name: '  Café  ' });
  assert.equal(named.deck, original.deck);
  assert.equal(named.matched, original.matched);
  assert.equal(named.selection, original.selection);
  assert.equal(original.name, '');
  assert.equal(renameGame(named, named.name), named);
  for (const name of ['x'.repeat(41), 'bad\rname', 'bad\nname'])
    assert.equal(renameGame(named, name), named);
  assert.deepEqual(renameGame(named, ''), original);
});

test('turns and active time retain the name while fresh games start unnamed', () => {
  const named = renameGame(createGame(EXAMPLE_CODE), 'Remember');
  const one = activateCard(named, 0);
  const mismatch = activateCard(one, 1);
  const closed = advanceGame(mismatch, MISMATCH_MS);
  for (const state of [one, mismatch, closed]) assert.equal(state.name, 'Remember');
  let completed = named;
  for (const [first, second] of EXAMPLE_PAIRS)
    completed = activateCard(activateCard(completed, first), second);
  assert.equal(isWon(completed), true);
  assert.equal(completed.name, 'Remember');
  assert.equal(renameGame(completed, 'Finished').name, 'Finished');
  assert.equal(createGame(named.boardCode).name, '');
});
