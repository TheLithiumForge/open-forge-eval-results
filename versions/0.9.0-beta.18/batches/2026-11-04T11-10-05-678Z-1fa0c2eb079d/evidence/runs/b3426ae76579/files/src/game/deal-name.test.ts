import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';

test('deal names preserve surrounding spaces and Unicode within the UTF-16 limit', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  assert.equal(isValidDealName(''), true);
  assert.equal(isValidDealName('  Café 🧩  '), true);
  assert.equal(isValidDealName('a'.repeat(DEAL_NAME_MAX_LENGTH)), true);
  assert.equal(isValidDealName('🧩'.repeat(20)), true);
});

test('deal names reject line breaks, nonstrings and names over 40 UTF-16 code units', () => {
  for (const name of [null, undefined, 1, '\n', 'line\rbreak', 'a'.repeat(41), '🧩'.repeat(21)])
    assert.equal(isValidDealName(name), false, String(name));
});
