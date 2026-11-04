import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';

test('deal names allow clearing, spaces and Unicode within 40 UTF-16 code units', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of ['', '  Café  ', ' \t ', 'e\u0301', '<b>name</b>', '\u0000', 'x'.repeat(40)])
    assert.equal(isValidDealName(name), true);
  assert.equal(isValidDealName('🃏'.repeat(20)), true);
  assert.equal(isValidDealName('🃏'.repeat(21)), false);
});

test('deal names reject line breaks, excess length and values other than strings', () => {
  for (const value of [null, undefined, 1, true, [], {}, 'x'.repeat(41), 'a\rb', 'a\nb', '\r\n'])
    assert.equal(isValidDealName(value), false);
});
