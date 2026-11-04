import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('deal names preserve spaces and Unicode within forty UTF-16 code units', () => {
  for (const name of ['', ' ', '  Café 🃏  ', 'x'.repeat(40), '🃏'.repeat(20), 'a\t\u2028b']) {
    assert.equal(isDealName(name), true);
    const initial = createGame(EXAMPLE_CODE);
    const named = renameGame(initial, name);
    assert.equal(named.name, name);
    assert.equal(initial.name, '');
  }
  for (const name of ['x'.repeat(41), '🃏'.repeat(21), 'a\rb', 'a\nb', 'a\r\nb']) {
    assert.equal(isDealName(name), false);
    const initial = createGame(EXAMPLE_CODE);
    assert.equal(renameGame(initial, name), initial);
  }
  for (const value of [null, undefined, 1, {}, []]) assert.equal(isDealName(value), false);
});

test('renaming and clearing leave the deal, progress and pending interval unchanged', () => {
  const progress = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
  const named = renameGame(progress, 'Café');
  assert.deepEqual(named, { ...progress, name: 'Café' });
  assert.equal(named.deck, progress.deck);
  assert.equal(named.selection, progress.selection);
  assert.equal(renameGame(named, 'Café'), named);
  assert.deepEqual(renameGame(named, ''), progress);
  assert.equal(createGame(EXAMPLE_CODE).name, '');
});
