import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from '../game.ts';
import {
  advanceTournament,
  beginTurn,
  currentPlayer,
  finishTurn,
  matchPlayers,
  matchWinner,
  roundForMatch,
  TournamentPhase,
} from './rules.ts';
import { completedTournament, tournamentFixture, wonTournamentGame } from './tournament.fixture.ts';

test('entry order produces the specified opening opponents in bracket order', () => {
  const four = tournamentFixture();
  assert.deepEqual(
    [matchPlayers(four, 0), matchPlayers(four, 1)],
    [
      [1, 4],
      [2, 3],
    ],
  );
  const eight = tournamentFixture(8);
  assert.deepEqual(
    [0, 1, 2, 3].map((index) => matchPlayers(eight, index)),
    [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ],
  );
  assert.deepEqual(matchPlayers(eight, 4), [null, null]);
  assert.deepEqual(
    [0, 4, 6].map((index) => roundForMatch(8, index)),
    [
      { name: 'Quarterfinal', size: 4 },
      { name: 'Semifinal', size: 6 },
      { name: 'Final', size: 8 },
    ],
  );
  assert.equal(roundForMatch(4, 0).name, 'Semifinal');
});

test('handoffs require Start turn and accept each completed deal only once', () => {
  const initial = tournamentFixture();
  const code = initial.matches[0]?.boardCode ?? '';
  const game = wonTournamentGame(code);
  assert.equal(currentPlayer(initial), 'Ada');
  assert.equal(finishTurn(initial, game), initial);
  const playing = beginTurn(initial);
  assert.equal(advanceTournament(playing), playing);
  assert.equal(finishTurn(playing, createGame(code)), playing);
  assert.equal(finishTurn(playing, wonTournamentGame('np1-6-2')), playing);
  const first = finishTurn(playing, game);
  assert.equal(first.phase, TournamentPhase.turnFinished);
  assert.equal(finishTurn(first, game), first);
  const ready = advanceTournament(first);
  assert.equal(currentPlayer(ready), 'Dev');
  assert.equal(ready.matches[0]?.boardCode, code);
  const second = finishTurn(beginTurn(ready), game);
  assert.equal(second.phase, TournamentPhase.matchFinished);
  assert.equal(matchWinner(second, 0), 1);
  assert.equal(advanceTournament(second).currentMatch, 1);
  assert.equal(initial.matches[0]?.results.length, 0);
});

test('moves settle results before exact active time, followed by the higher seed', () => {
  const tournament = completedTournament(8);
  for (const [results, expected] of [
    [
      [
        { moves: 9, elapsedMs: 900 },
        { moves: 10, elapsedMs: 1 },
      ],
      1,
    ],
    [
      [
        { moves: 10, elapsedMs: 100.2 },
        { moves: 10, elapsedMs: 100.1 },
      ],
      8,
    ],
    [
      [
        { moves: 10, elapsedMs: 100.1 },
        { moves: 10, elapsedMs: 100.1 },
      ],
      1,
    ],
  ] as const) {
    const matches = tournament.matches.map((match, index) =>
      index === 0 ? { ...match, results } : match,
    );
    assert.equal(matchWinner({ ...tournament, matches }, 0), expected);
  }
  assert.equal(matchWinner(tournament, 6), 1);
});

test('four and eight player knockouts promote winners and end with one champion', () => {
  const four = completedTournament();
  assert.equal(four.phase, TournamentPhase.completed);
  assert.deepEqual(matchPlayers(four, 2), [1, 2]);
  assert.equal(matchWinner(four, 2), 1);
  assert.equal(advanceTournament(four), four);
  const eight = completedTournament(8);
  assert.deepEqual(matchPlayers(eight, 4), [1, 4]);
  assert.deepEqual(matchPlayers(eight, 5), [3, 2]);
  assert.deepEqual(matchPlayers(eight, 6), [1, 2]);
  assert.equal(eight.matches.length, 7);
});
