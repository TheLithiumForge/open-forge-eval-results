import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from '../game.ts';
import {
  createTournament,
  finishTurn,
  matchPlayers,
  matchSizes,
  matchWinner,
  nameProblem,
  nextTurn,
  normalizeName,
  roundName,
  TournamentPhase,
} from './rules.ts';
import type { Tournament } from './rules.ts';

test('names normalize whitespace and Unicode, count code points, and reject repeats throughout the group', () => {
  assert.equal(normalizeName('  Cafe\u0301 \t Jones  '), 'Café Jones');
  assert.equal(nameProblem(['A😀', '😀'.repeat(20), 'Al', 'Café']), null);
  for (const name of ['', 'A', 'x'.repeat(21)])
    assert.equal(nameProblem([name]), 'Use 2 to 20 characters.');
  assert.equal(nameProblem(['Mira', 'Ada', 'Bo', ' MIRA ']), 'Each name must be different.');
  assert.equal(nameProblem(['Cafe\u0301', 'Café']), 'Each name must be different.');
});

test('entry order fixes both bracket shapes and the stage dimensions and names', () => {
  const four = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], ['np1-6-1', 'np1-6-2', 'np1-8-1']);
  assert.deepEqual(
    [matchPlayers(four, 0), matchPlayers(four, 1), matchPlayers(four, 2)],
    [
      [0, 3],
      [1, 2],
      [null, null],
    ],
  );
  const eight = createTournament(['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'], []);
  assert.deepEqual(
    [0, 1, 2, 3].map((index) => matchPlayers(eight, index)),
    [
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ],
  );
  assert.deepEqual(matchSizes(4), [6, 6, 8]);
  assert.deepEqual(matchSizes(8), [4, 4, 4, 4, 6, 6, 8]);
  assert.deepEqual([4, 6, 8].map(roundName), ['Quarterfinal', 'Semifinal', 'Final']);
});

test('results compare moves before precise active time before seed', () => {
  const initial = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], ['np1-6-1', 'np1-6-2', 'np1-8-1']);
  for (const [left, right, expected] of [
    [18, 19, 0],
    [19, 18, 3],
    [18, 18, 3],
  ]) {
    const tournament: Tournament = {
      ...initial,
      matches: [
        {
          boardCode: 'np1-6-1',
          results: [
            { moves: left ?? 18, elapsedMs: 100.75 },
            { moves: right ?? 18, elapsedMs: 100.5 },
          ],
        },
      ],
    };
    assert.equal(matchWinner(tournament, 0), expected);
  }
  const tied: Tournament = {
    ...initial,
    matches: [
      {
        boardCode: 'np1-6-1',
        results: [
          { moves: 18, elapsedMs: 0 },
          { moves: 18, elapsedMs: 0 },
        ],
      },
    ],
  };
  assert.equal(matchWinner(tied, 0), 0);
});

test('complete matches advance their winners and finish with one champion without mutating earlier results', () => {
  let tournament = createTournament(
    ['Ada', 'Bo', 'Cora', 'Dev'],
    ['np1-6-1', 'np1-6-2', 'np1-8-1'],
  );
  const initial = tournament;
  for (let match = 0; match < 3; match++) {
    for (let turn = 0; turn < 2; turn++) {
      const game = createGame(tournament.matches[match]?.boardCode ?? 'np1-4-1');
      assert.equal(finishTurn(tournament, game), tournament);
      tournament = { ...tournament, phase: TournamentPhase.playing };
      assert.equal(finishTurn(tournament, game), tournament);
      tournament = finishTurn(tournament, {
        ...game,
        started: true,
        matched: game.deck.map((_, index) => index),
        moves: game.deck.length / 2,
        elapsedMs: 0,
      });
      assert.equal(
        tournament.phase,
        turn === 0
          ? TournamentPhase.turnOver
          : match === 2
            ? TournamentPhase.complete
            : TournamentPhase.matchOver,
      );
      if (turn === 0) tournament = nextTurn(tournament);
    }
    if (match < 2) tournament = nextTurn(tournament);
  }
  assert.deepEqual(matchPlayers(tournament, 2), [0, 1]);
  assert.equal(matchWinner(tournament, 2), 0);
  assert.equal(nextTurn(tournament), tournament);
  assert.deepEqual(
    initial.matches.map((match) => match.results),
    [[], [], []],
  );
});
