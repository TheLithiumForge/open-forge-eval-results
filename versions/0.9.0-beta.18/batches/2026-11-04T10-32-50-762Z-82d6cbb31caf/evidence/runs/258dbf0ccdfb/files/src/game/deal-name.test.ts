import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';

test('names preserve spaces, Unicode and other characters within 40 UTF-16 code units', () => {
  for (const name of ['', '  Café 🃏  ', '   ', '\t"<>&\u2028', 'a'.repeat(40), '🃏'.repeat(20)]) {
    assert.equal(isDealName(name), true);
    const initial = createGame('np1-4-1');
    const named = renameGame(initial, name);
    assert.equal(named.name, name);
    assert.deepEqual({ ...named, name: '' }, initial);
    assert.equal(initial.name, '');
    assert.equal(renameGame(named, name), named);
  }
});

test('invalid names leave progress untouched and clearing makes a game unnamed', () => {
  const named = renameGame(activateCard(createGame('np1-4-1'), 0), 'Café');
  for (const name of ['a'.repeat(41), '🃏'.repeat(20) + 'a', 'a\nb', '\r', '\r\n']) {
    assert.equal(isDealName(name), false);
    assert.equal(renameGame(named, name), named);
  }
  for (const value of [null, undefined, 5, false, {}, []]) assert.equal(isDealName(value), false);
  assert.deepEqual(renameGame(named, ''), { ...named, name: '' });
  const played = advanceGame(activateCard(named, 1), 175);
  assert.equal(played.name, 'Café');
  assert.equal(played.moves, 1);
  assert.equal(played.elapsedMs, 175);
});
