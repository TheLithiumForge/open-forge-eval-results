import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  createTournament,
  matchPlayers,
  matchWinner,
  nameProblem,
  normalizeName,
  recordTournamentResult,
  tournamentRound,
} from './rules.ts';
import { activateSession, initialSession, replaceGame } from '../session/session.ts';
import { createGame } from '../game.ts';
import { EXAMPLE_PAIRS } from '../game.fixture.ts';

const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];
const EIGHT = [...FOUR, 'Emi', 'Finn', 'Gia', 'Hal'];

test('names normalize whitespace and NFC before checking code points and case-insensitive duplicates', () => {
  assert.equal(normalizeName('  Cafe\u0301 \t  Noir  '), 'Café Noir');
  assert.equal(nameProblem(['A😀', '😀'.repeat(20)]), null);
  for (const name of ['', 'A', 'a'.repeat(21), '😀'.repeat(21)])
    assert.equal(nameProblem([name]), 'Use 2 to 20 characters.');
  assert.equal(nameProblem(['Ada', 'Bo', 'ADA']), 'Each name must be different.');
  assert.throws(() => createTournament(['Ada', 'Bo', 'ada', 'Dev'], []));
});

test('four entrants open in semifinals with literal entry-order pairings', () => {
  const event = createTournament(FOUR, ['np1-6-1', 'np1-6-2', 'np1-8-1']);
  assert.deepEqual(matchPlayers(event, 0), [1, 4]);
  assert.deepEqual(matchPlayers(event, 1), [2, 3]);
  assert.deepEqual(matchPlayers(event, 2), [null, null]);
  assert.deepEqual(
    event.matches.map((_, index) => tournamentRound(4, index)),
    [
      { name: 'Semifinal', size: 6 },
      { name: 'Semifinal', size: 6 },
      { name: 'Final', size: 8 },
    ],
  );
});

test('eight entrants advance through every match with the prescribed pairing order and round sizes', () => {
  let event = createTournament(EIGHT, [
    'np1-4-1',
    'np1-4-2',
    'np1-4-3',
    'np1-4-4',
    'np1-6-1',
    'np1-6-2',
    'np1-8-1',
  ]);
  assert.deepEqual(
    [0, 1, 2, 3].map((index) => matchPlayers(event, index)),
    [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ],
  );
  const expected = [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
    [1, 4],
    [3, 2],
    [1, 2],
  ];
  for (let index = 0; index < event.matches.length; index += 1) {
    assert.deepEqual(matchPlayers(event, index), expected[index]);
    const round = tournamentRound(8, index);
    assert.equal(round.size, index < 4 ? 4 : index < 6 ? 6 : 8);
    const result = { moves: round.size ** 2 / 2, elapsedMs: 1200.25 };
    const original = event;
    event = recordTournamentResult(event, index, result);
    assert.equal(original.matches[index]?.results.length, 0);
    event = recordTournamentResult(event, index, result);
    assert.equal(recordTournamentResult(event, index, result), event);
  }
  assert.equal(matchWinner(event, 6), 1);
  assert.equal(event.players[0], 'Ada');
});

test('moves precede exact active time and seed breaks exact ties', () => {
  const initial = createTournament(FOUR, ['np1-6-1', 'np1-6-2', 'np1-8-1']);
  const winner = (leftMoves: number, leftTime: number, rightMoves: number, rightTime: number) => {
    let event = recordTournamentResult(initial, 0, { moves: leftMoves, elapsedMs: leftTime });
    event = recordTournamentResult(event, 0, { moves: rightMoves, elapsedMs: rightTime });
    return matchWinner(event, 0);
  };
  assert.equal(winner(18, 5000, 19, 1000), 1);
  assert.equal(winner(19, 1000, 18, 5000), 4);
  assert.equal(winner(18, 1000.5, 18, 1000.25), 4);
  assert.equal(winner(18, 1000.25, 18, 1000.25), 1);
  assert.equal(recordTournamentResult(initial, 2, { moves: 32, elapsedMs: 0 }), initial);
});

test('every match has a distinct code at the required board size', () => {
  assert.throws(() => createTournament(FOUR, ['np1-6-1', 'np1-6-1', 'np1-8-1']));
  assert.throws(() => createTournament(FOUR, ['np1-4-1', 'np1-6-2', 'np1-8-1']));
  assert.throws(() => createTournament(FOUR, ['np1-6-1']));
});

test('tournament game replacement and completion preserve solo preferences', () => {
  const preferences = { size: 10, bestMoves: { '4': 12 } };
  let session = initialSession('np1-10-1', preferences);
  session = replaceGame(session, createGame('np1-4-1'), false, false);
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) session = activateSession(session, index, false);
  assert.equal(session.game.moves, 8);
  assert.equal(session.preferences, preferences);
});
