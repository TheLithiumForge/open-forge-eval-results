import assert from 'node:assert/strict';
import { test } from 'vitest';
import { winningSeed } from './scoring.ts';

test('moves decide before elapsed time', () => {
  assert.equal(
    winningSeed(1, { moves: 12, elapsedMs: 70_200 }, 2, { moves: 13, elapsedMs: 58_100 }),
    1,
  );
});

test('elapsed time breaks equal move counts', () => {
  assert.equal(
    winningSeed(1, { moves: 15, elapsedMs: 65_200 }, 4, { moves: 15, elapsedMs: 65_900 }),
    1,
  );
});

test('higher-ranked seed wins exact result ties', () => {
  assert.equal(
    winningSeed(2, { moves: 15, elapsedMs: 65_200 }, 4, { moves: 15, elapsedMs: 65_200 }),
    2,
  );
});
