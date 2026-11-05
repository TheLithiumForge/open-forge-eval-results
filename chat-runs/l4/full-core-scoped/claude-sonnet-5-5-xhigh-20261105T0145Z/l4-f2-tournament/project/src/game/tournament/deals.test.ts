import assert from 'node:assert/strict';
import { test } from 'vitest';
import { parseBoardCode } from '../deck.ts';
import { dealCodes } from './deals.ts';
import { dealSizes, hasValidDeals } from './rules.ts';

test('every match of a tournament gets a different valid code at the size of its stage', () => {
  for (const count of [4, 8]) {
    const codes = dealCodes(dealSizes(count));
    assert.equal(hasValidDeals(count, codes), true);
    assert.deepEqual(
      codes.map((code) => parseBoardCode(code)?.size),
      dealSizes(count),
    );
  }
});

test('a repeated code is drawn again until it is new', () => {
  const drawn = ['np1-4-5', 'np1-4-5', 'np1-4-5', 'np1-4-6', 'np1-6-5', 'np1-6-5', 'np1-6-7'];
  const asked: number[] = [];
  const codes = dealCodes([4, 4, 6, 6], (size) => {
    asked.push(size);
    return drawn.shift() ?? 'np1-4-1';
  });
  assert.deepEqual(codes, ['np1-4-5', 'np1-4-6', 'np1-6-5', 'np1-6-7']);
  assert.deepEqual(asked, [4, 4, 4, 4, 6, 6, 6]);
});
