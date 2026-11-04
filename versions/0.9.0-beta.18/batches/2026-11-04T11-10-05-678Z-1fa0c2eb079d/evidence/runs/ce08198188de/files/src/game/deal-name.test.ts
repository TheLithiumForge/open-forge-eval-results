import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';

test('deal names preserve spaces and characters while counting UTF-16 code units', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of [
    '',
    ' ',
    '  Café 🃏  ',
    '\t\0"\\<>',
    '\u2028\u2029',
    'e\u0301',
    'a'.repeat(40),
    '🃏'.repeat(20),
  ])
    assert.equal(isValidDealName(name), true, JSON.stringify(name));
  for (const name of ['a'.repeat(41), '🃏'.repeat(20) + 'a', '\r', '\n', 'Café\r\n', null, 12, {}])
    assert.equal(isValidDealName(name), false, JSON.stringify(name));
});
