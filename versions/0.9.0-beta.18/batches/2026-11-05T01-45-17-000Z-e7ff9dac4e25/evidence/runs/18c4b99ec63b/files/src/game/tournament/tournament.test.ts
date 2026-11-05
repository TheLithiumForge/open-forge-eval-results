import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  champion,
  createTournament,
  gridSize,
  isFinished,
  isPlayerCount,
  matchPlayers,
  matchTitle,
  matchWinner,
  PLAYER_COUNTS,
  recordTurn,
  roundMatches,
  roundName,
  turnAt,
  turnsPlayed,
} from './tournament.ts';
import {
  dealCodes,
  EIGHT_PLAYERS,
  FOUR_PLAYERS,
  firstPlayersWin,
  newTournament,
  playTurns,
  turn,
} from './tournament.fixture.ts';

test('four and eight are the only player counts', () => {
  assert.deepEqual(PLAYER_COUNTS, [4, 8]);
  for (const count of [0, 1, 2, 3, 5, 6, 7, 9, 16]) assert.equal(isPlayerCount(count), false);
  for (const count of PLAYER_COUNTS) assert.equal(isPlayerCount(count), true);
});

test('a tournament needs one deal for each of its matches', () => {
  assert.throws(() => createTournament(['Ann', 'Ben'], dealCodes(1)));
  assert.throws(() => createTournament(FOUR_PLAYERS, dealCodes(4)));
  assert.throws(() => createTournament(EIGHT_PLAYERS, dealCodes(3)));
  assert.equal(newTournament(FOUR_PLAYERS).matches.length, 3);
  assert.equal(newTournament(EIGHT_PLAYERS).matches.length, 7);
});

test('rounds run from the first matches to the final and carry their names', () => {
  assert.deepEqual(roundMatches(4), [[0, 1], [2]]);
  assert.deepEqual(roundMatches(8), [[0, 1, 2, 3], [4, 5], [6]]);
  assert.deepEqual(
    [0, 1].map((round) => roundName(4, round)),
    ['Semifinal', 'Final'],
  );
  assert.deepEqual(
    [0, 1, 2].map((round) => roundName(8, round)),
    ['Quarterfinal', 'Semifinal', 'Final'],
  );
  assert.deepEqual(
    [0, 1, 2].map((match) => matchTitle(4, match)),
    ['Semifinal 1', 'Semifinal 2', 'Final'],
  );
  assert.equal(matchTitle(8, 3), 'Quarterfinal 4');
  assert.equal(matchTitle(8, 5), 'Semifinal 2');
  assert.equal(matchTitle(8, 6), 'Final');
});

test('the first round pairs players in the order they were listed', () => {
  const tournament = newTournament(EIGHT_PLAYERS);
  assert.deepEqual(matchPlayers(tournament, 0), ['Ann', 'Ben']);
  assert.deepEqual(matchPlayers(tournament, 3), ['Gus', 'Hal']);
  assert.deepEqual(matchPlayers(tournament, 4), [null, null]);
  assert.equal(gridSize(tournament), 4);
});

test('fewer moves win a match, then less time, then the player listed first', () => {
  const fewerMoves = playTurns(newTournament(FOUR_PLAYERS), [turn(12, 1000), turn(9, 90_000)]);
  assert.equal(matchWinner(fewerMoves, 0), 'Ben');
  const firstFewer = playTurns(newTournament(FOUR_PLAYERS), [turn(9, 90_000), turn(12, 1000)]);
  assert.equal(matchWinner(firstFewer, 0), 'Ann');
  const shorter = playTurns(newTournament(FOUR_PLAYERS), [turn(10, 5000), turn(10, 4999)]);
  assert.equal(matchWinner(shorter, 0), 'Ben');
  const tied = playTurns(newTournament(FOUR_PLAYERS), [turn(10, 5000), turn(10, 5000)]);
  assert.equal(matchWinner(tied, 0), 'Ann');
});

test('a match has no winner until both players have played', () => {
  const tournament = newTournament(FOUR_PLAYERS);
  assert.equal(matchWinner(tournament, 0), null);
  assert.equal(matchWinner(recordTurn(tournament, turn(8)), 0), null);
  assert.equal(matchWinner(tournament, 99), null);
});

test('turns run through every match in order and the last one decides the champion', () => {
  let tournament = newTournament(FOUR_PLAYERS);
  const order: (string | undefined)[] = [];
  for (let index = 0; index < 6; index += 1) {
    const info = turnAt(tournament, index);
    order.push(info?.player);
    assert.equal(info?.match, Math.floor(index / 2));
    assert.equal(info?.boardCode, tournament.matches[Math.floor(index / 2)]?.boardCode);
    assert.equal(turnsPlayed(tournament), index);
    assert.equal(isFinished(tournament), false);
    assert.equal(champion(tournament), null);
    // Ann, Cy and the winners of the first round each need 8 moves against 9.
    tournament = recordTurn(tournament, turn(index % 2 === 0 ? 8 : 9));
  }
  // The final pairs the winners of both semifinals, which are Ann and Cy.
  assert.deepEqual(order, ['Ann', 'Ben', 'Cy', 'Dee', 'Ann', 'Cy']);
  assert.equal(isFinished(tournament), true);
  assert.equal(champion(tournament), 'Ann');
  assert.equal(turnAt(tournament, 6), null);
  assert.equal(turnAt(tournament, -1), null);
  assert.equal(recordTurn(tournament, turn(8)), tournament);
});

test('winners move up through all three rounds of an eight player tournament', () => {
  const tournament = newTournament(EIGHT_PLAYERS);
  const results = [
    // Quarterfinals: Ben, Cy, Fay and Hal win.
    [10, 9],
    [8, 9],
    [11, 7],
    [12, 6],
    // Semifinals: Ben against Cy and Fay against Hal.
    [9, 9],
    [5, 6],
    // Final: Ben against Fay.
    [8, 7],
  ].flat();
  const played = playTurns(
    tournament,
    results.map((moves, index) => turn(moves, index)),
  );
  assert.equal(turnsPlayed(played), 14);
  assert.deepEqual(matchPlayers(played, 4), ['Ben', 'Cy']);
  assert.deepEqual(matchPlayers(played, 5), ['Fay', 'Hal']);
  assert.deepEqual(matchPlayers(played, 6), ['Ben', 'Fay']);
  assert.equal(champion(played), 'Fay');
});

test('recording a turn leaves the earlier tournament as it was', () => {
  const tournament = newTournament(FOUR_PLAYERS);
  const next = recordTurn(tournament, turn(8));
  assert.equal(turnsPlayed(tournament), 0);
  assert.equal(turnsPlayed(next), 1);
  assert.deepEqual(next.matches[0]?.turns, [turn(8)]);
  assert.equal(
    firstPlayersWin(tournament).matches.every((match) => match.turns.length === 2),
    true,
  );
});
