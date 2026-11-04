import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isDealName } from './deal-name.ts';

test('deal names preserve text, allow clearing and count UTF-16 code units', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  for (const name of ['', ' ', '  Café 🃏  ', '\t', 'a'.repeat(40), '🃏'.repeat(20), '\u2028'])
    assert.equal(isDealName(name), true);
  for (const name of [null, 1, [], {}, 'a'.repeat(41), '🃏'.repeat(21), '\r', '\n', 'a\r\nb'])
    assert.equal(isDealName(name), false);
});
