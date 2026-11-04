import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';

test('deal names preserve spaces and allow forty UTF-16 code units', () => {
  assert.equal(isValidDealName('  Café 🐈  '), true);
  assert.equal(isValidDealName('x'.repeat(DEAL_NAME_MAX_LENGTH)), true);
  assert.equal(isValidDealName('🐈'.repeat(DEAL_NAME_MAX_LENGTH / 2)), true);
  assert.equal(isValidDealName('x'.repeat(DEAL_NAME_MAX_LENGTH + 1)), false);
  assert.equal(isValidDealName('🐈'.repeat(DEAL_NAME_MAX_LENGTH / 2 + 1)), false);
});

test('deal names reject nonstrings and carriage returns or line feeds', () => {
  for (const value of [null, undefined, 4, {}, [], 'name\r', 'name\n', 'a\r\nb']) {
    assert.equal(isValidDealName(value), false);
  }
  assert.equal(isValidDealName(''), true);
});
