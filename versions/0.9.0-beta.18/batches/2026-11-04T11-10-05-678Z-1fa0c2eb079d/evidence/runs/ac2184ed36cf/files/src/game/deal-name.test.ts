import assert from 'node:assert/strict';
import { test } from 'vitest';
import { DEAL_NAME_MAX_LENGTH, isValidDealName } from './deal-name.ts';

test('deal names use a 40 UTF-16 code unit limit and preserve ordinary characters', () => {
  assert.equal(DEAL_NAME_MAX_LENGTH, 40);
  assert.equal(isValidDealName('😀'.repeat(20)), true);
  assert.equal(isValidDealName('😀'.repeat(20) + 'a'), false);
  assert.equal(isValidDealName('  Café 🎴  '), true);
  assert.equal(isValidDealName(''), true);
});

test('deal names reject carriage returns and line feeds', () => {
  assert.equal(isValidDealName('first\nsecond'), false);
  assert.equal(isValidDealName('first\rsecond'), false);
});
