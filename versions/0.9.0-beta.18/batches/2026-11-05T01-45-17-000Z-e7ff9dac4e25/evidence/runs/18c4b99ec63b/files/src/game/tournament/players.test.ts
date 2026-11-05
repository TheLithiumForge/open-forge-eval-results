import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  hasDistinctNames,
  isValidName,
  NAME_MAX_CHARACTERS,
  normalizeName,
  resolvePlayers,
} from './players.ts';

test('names keep single spaces, lose control characters and stop at the limit', () => {
  assert.equal(normalizeName('  Ann   Lee \t'), 'Ann Lee');
  assert.equal(normalizeName('A\u0007nn\nLee'), 'A nn Lee');
  assert.equal(normalizeName('   '), '');
  const long = normalizeName('x'.repeat(NAME_MAX_CHARACTERS + 10));
  assert.equal(long.length, NAME_MAX_CHARACTERS);
  assert.equal([...normalizeName('\u{1F600}'.repeat(NAME_MAX_CHARACTERS + 1))].length, 24);
});

test('only a normalized, non-empty name is valid', () => {
  assert.equal(isValidName('Ann'), true);
  assert.equal(isValidName(''), false);
  assert.equal(isValidName(' Ann'), false);
  assert.equal(isValidName('Ann  Lee'), false);
  assert.equal(isValidName('x'.repeat(NAME_MAX_CHARACTERS + 1)), false);
});

test('names that differ only in letter case are not distinct', () => {
  assert.equal(hasDistinctNames(['Ann', 'Ben']), true);
  assert.equal(hasDistinctNames(['Ann', 'ann']), false);
});

test('blank entries play under their own label and duplicates give no players', () => {
  assert.deepEqual(resolvePlayers(['Ann', '', ' Cy ', ''], 4), [
    'Ann',
    'Player 2',
    'Cy',
    'Player 4',
  ]);
  assert.deepEqual(resolvePlayers(['Ann', 'Ben', 'Cy', 'Dee', 'Eve'], 4), [
    'Ann',
    'Ben',
    'Cy',
    'Dee',
  ]);
  assert.equal(resolvePlayers([], 8)?.length, 8);
  assert.equal(resolvePlayers(['Ann', 'ANN'], 4), null);
  assert.equal(resolvePlayers(['Player 2', '', '', ''], 4), null);
});
