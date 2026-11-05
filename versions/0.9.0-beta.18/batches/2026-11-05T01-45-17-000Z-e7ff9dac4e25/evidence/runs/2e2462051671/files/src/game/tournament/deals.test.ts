import assert from 'node:assert/strict';
import { test } from 'vitest';
import { parseBoardCode } from '../deck.ts';
import { dealCodes } from './deals.ts';

test('every match gets its own code at the size of its stage', () => {
  const eight = dealCodes(8).map((code) => parseBoardCode(code)?.size);
  assert.deepEqual(eight, [4, 4, 4, 4, 6, 6, 8]);
  const four = dealCodes(4).map((code) => parseBoardCode(code)?.size);
  assert.deepEqual(four, [6, 6, 8]);
});

test('no two matches of a tournament share a full board code', () => {
  for (let run = 0; run < 50; run += 1) {
    const codes = dealCodes(8);
    assert.equal(new Set(codes).size, codes.length);
  }
});
