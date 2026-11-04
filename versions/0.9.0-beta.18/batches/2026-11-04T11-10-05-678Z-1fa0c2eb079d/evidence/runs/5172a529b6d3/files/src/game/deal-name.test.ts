import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, DEAL_NAME_MAX_LENGTH, isValidDealName, setDealName } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

test('deal names preserve all allowed characters and UTF-16 boundaries', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of ['', ' spaced name ', ' '.repeat(40), 'x'.repeat(40), '😀'.repeat(20)]) {
    assert.equal(isValidDealName(name), true);
    assert.equal(setDealName(createGame(EXAMPLE_CODE), name).name, name);
  }
  for (const name of ['😀'.repeat(21), 'a'.repeat(41), 'line\nfeed', 'line\rreturn'])
    assert.equal(isValidDealName(name), false, `reject ${JSON.stringify(name)}`);
  assert.equal(isValidDealName(null), false);
});

test('setting or clearing a deal name leaves progress untouched', () => {
  const state = { ...createGame(EXAMPLE_CODE), moves: 2, elapsedMs: 250, started: true };
  const named = setDealName(state, '  Café  ');
  assert.deepEqual(named, { ...state, name: '  Café  ' });
  assert.deepEqual(setDealName(named, ''), state);
  assert.equal(setDealName(state, 'invalid\nname'), state);
  assert.equal(setDealName(state, 'x'.repeat(41)), state);
  assert.equal(setDealName(state, ''), state);
});
