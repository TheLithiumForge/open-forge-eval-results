import assert from 'node:assert/strict';
import { test } from 'vitest';
import { matchBoardSize, matchRound, openingSeeds, Round, roundNames } from './bracket.ts';

test('opening seeds pair the ends of the entry list in displayed bracket order', () => {
  assert.deepEqual(
    [0, 1, 2, 3].map((position) => openingSeeds(8, position)),
    [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ],
  );
  assert.deepEqual(
    [0, 1].map((position) => openingSeeds(4, position)),
    [
      [1, 4],
      [2, 3],
    ],
  );
  assert.equal(openingSeeds(6, 0), null);
});

test('rounds are named by stage and use their board sizes', () => {
  assert.deepEqual(roundNames(8), [Round.quarterfinal, Round.semifinal, Round.final]);
  assert.deepEqual(roundNames(4), [Round.semifinal, Round.final]);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((index) => [matchRound(8, index), matchBoardSize(8, index)]),
    [
      ['Quarterfinal', 4],
      ['Quarterfinal', 4],
      ['Quarterfinal', 4],
      ['Quarterfinal', 4],
      ['Semifinal', 6],
      ['Semifinal', 6],
      ['Final', 8],
    ],
  );
  assert.deepEqual(
    [0, 1, 2].map((index) => matchRound(4, index)),
    ['Semifinal', 'Semifinal', 'Final'],
  );
});
