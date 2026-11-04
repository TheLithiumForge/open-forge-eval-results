import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isDealName, renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

test('renaming preserves all progress and clearing a name restores version 1 exports', () => {
  const state = advanceGame(activateCard(activateCard(createGame('np1-4-1'), 0), 1), 125);
  assert.equal(state.name, '');
  const named = renameGame(state, '  Café 🃏  ');
  assert.deepEqual(named, { ...state, name: '  Café 🃏  ' });
  assert.equal(named.deck, state.deck);
  assert.equal(named.matched, state.matched);
  assert.equal(named.selection, state.selection);
  assert.equal(state.name, '', 'source state stays unchanged');
  assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);
  assert.equal(renameGame(named, named.name), named);
  const unnamed = renameGame(named, '');
  assert.deepEqual(unnamed, state);
  assert.deepEqual(encodeSnapshot(unnamed), encodeSnapshot(state));
});

test('name validation counts UTF-16 code units and rejects only length and line breaks', () => {
  const state = renameGame(createGame('np1-4-1'), 'Keep me');
  for (const name of ['a'.repeat(41), '🃏'.repeat(21), '\r', '\n', 'line\r\nbreak']) {
    assert.equal(isDealName(name), false);
    assert.equal(renameGame(state, name), state, 'invalid edit leaves progress intact');
  }
  for (const value of [null, undefined, 1, {}, []]) assert.equal(isDealName(value), false);
  for (const name of ['', ' ', 'a'.repeat(40), '🃏'.repeat(20), '\t\u0000']) {
    assert.equal(isDealName(name), true);
    assert.equal(renameGame(state, name).name, name);
  }
});

test('card actions and active time preserve the name through completion', () => {
  const named = renameGame(createGame('np1-4-1'), 'Café');
  const one = activateCard(named, 0);
  const mismatch = activateCard(one, 1);
  assert.equal(advanceGame(mismatch, 800).name, named.name);
  let state = named;
  for (const pair of [
    [0, 11],
    [1, 9],
    [2, 6],
    [3, 7],
    [4, 5],
    [8, 15],
    [10, 14],
    [12, 13],
  ])
    for (const index of pair) state = activateCard(state, index);
  assert.equal(state.name, named.name);
  assert.deepEqual(renameGame(state, 'Finished'), { ...state, name: 'Finished' });
});
