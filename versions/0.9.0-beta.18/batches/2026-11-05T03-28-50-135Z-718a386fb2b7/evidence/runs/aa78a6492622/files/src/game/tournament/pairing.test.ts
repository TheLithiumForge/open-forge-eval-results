import assert from 'node:assert/strict';
import { test } from 'vitest';
import { matchPlans } from './pairing.ts';

test('four entrants open in entry order with semifinal and final sizes', () => {
  assert.deepEqual(
    matchPlans(4).map((match) => [match.round, match.size, match.playerSeeds]),
    [
      ['Semifinal', 6, [1, 4]],
      ['Semifinal', 6, [2, 3]],
      ['Final', 8, [null, null]],
    ],
  );
});

test('eight entrants use the specified quarterfinal order and stage sizes', () => {
  assert.deepEqual(
    matchPlans(8).map((match) => [match.round, match.size, match.playerSeeds]),
    [
      ['Quarterfinal', 4, [1, 8]],
      ['Quarterfinal', 4, [4, 5]],
      ['Quarterfinal', 4, [3, 6]],
      ['Quarterfinal', 4, [2, 7]],
      ['Semifinal', 6, [null, null]],
      ['Semifinal', 6, [null, null]],
      ['Final', 8, [null, null]],
    ],
  );
});
