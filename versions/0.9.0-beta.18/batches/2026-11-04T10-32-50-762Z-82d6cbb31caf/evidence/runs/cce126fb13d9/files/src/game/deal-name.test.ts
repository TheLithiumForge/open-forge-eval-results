import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { renameGame } from './deal-name.ts';

test('renaming changes only the name and later play preserves it', () => {
  const game = advanceGame(activateCard(activateCard(createGame('np1-4-1'), 0), 1), 123.5);
  assert.equal(game.name, '');
  const renamed = renameGame(game, '  Café 🃏  ');
  assert.deepEqual(renamed, { ...game, name: '  Café 🃏  ' });
  assert.equal(renamed.deck, game.deck);
  assert.equal(renamed.selection, game.selection);
  assert.equal(renamed.matched, game.matched);
  assert.equal(advanceGame(renamed, 800).name, renamed.name);
  assert.equal(activateCard(advanceGame(renamed, 800), 2).name, renamed.name);
  assert.deepEqual(renameGame(renamed, ''), game);
});

test('names accept forty UTF-16 units and reject longer values or line breaks', () => {
  const game = createGame('np1-4-1');
  for (const name of ['x'.repeat(40), '🃏'.repeat(20), '  ', '<b>&"'])
    assert.equal(renameGame(game, name).name, name);
  for (const name of ['x'.repeat(41), '🃏'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(renameGame(game, name), game);
});
