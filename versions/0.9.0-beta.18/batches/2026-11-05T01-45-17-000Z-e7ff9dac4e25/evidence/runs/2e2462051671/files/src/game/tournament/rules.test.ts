import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  boardSizeOf,
  championOf,
  createTournament,
  isFinished,
  nameOf,
  nextTurn,
  pickWinner,
  recordResult,
  roundOf,
  runnerUpOf,
  seedsOf,
  winnerOf,
} from './rules.ts';
import type { Result, Tournament } from './rules.ts';

const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];
const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
const CODES = ['np1-4-11', 'np1-4-12', 'np1-4-13', 'np1-4-14', 'np1-6-15', 'np1-6-16', 'np1-8-17'];

function opponents(tournament: Tournament, match: number): string[] {
  return (seedsOf(tournament, match) ?? []).map((seed) => nameOf(tournament, seed));
}

// Plays every turn so that the first player of each match wins with fewer moves.
function playOut(tournament: Tournament, turns = Infinity): Tournament {
  let current = tournament;
  for (let played = 0; played < turns; played += 1) {
    const turn = nextTurn(current);
    if (!turn) break;
    const moves = 20 + turn.seat;
    current = recordResult(current, { moves, elapsedMs: 5000 });
  }
  return current;
}

test('four entrants open as seed 1 against 4 and 2 against 3', () => {
  const tournament = createTournament(FOUR, CODES.slice(0, 3));
  assert.deepEqual(opponents(tournament, 0), ['Ada', 'Dev']);
  assert.deepEqual(opponents(tournament, 1), ['Bo', 'Cora']);
  assert.equal(seedsOf(tournament, 2), null);
});

test('eight entrants open 1 against 8, 4 against 5, 3 against 6 then 2 against 7', () => {
  const tournament = createTournament(EIGHT, CODES);
  assert.deepEqual(opponents(tournament, 0), ['Ada', 'Hal']);
  assert.deepEqual(opponents(tournament, 1), ['Dev', 'Emi']);
  assert.deepEqual(opponents(tournament, 2), ['Cora', 'Finn']);
  assert.deepEqual(opponents(tournament, 3), ['Bo', 'Gia']);
});

test('rounds are named by stage and a bracket of four has no quarterfinal', () => {
  const four = [0, 1, 2].map((match) => roundOf(4, match));
  assert.deepEqual(four, ['Semifinal', 'Semifinal', 'Final']);
  const eight = [0, 1, 2, 3, 4, 5, 6].map((match) => roundOf(8, match));
  assert.deepEqual(eight, [
    'Quarterfinal',
    'Quarterfinal',
    'Quarterfinal',
    'Quarterfinal',
    'Semifinal',
    'Semifinal',
    'Final',
  ]);
});

test('stages use the 4x4, 6x6 and 8x8 boards', () => {
  assert.deepEqual(
    [0, 1, 2].map((match) => boardSizeOf(4, match)),
    [6, 6, 8],
  );
  assert.deepEqual(
    [0, 3, 4, 5, 6].map((match) => boardSizeOf(8, match)),
    [4, 4, 6, 6, 8],
  );
});

test('fewer moves win even when the other player was faster', () => {
  const quick: Result = { moves: 13, elapsedMs: 58_100 };
  const efficient: Result = { moves: 12, elapsedMs: 70_200 };
  assert.equal(pickWinner({ seed: 1, result: quick }, { seed: 4, result: efficient }), 4);
});

test('equal moves go to the lower active time using exact milliseconds', () => {
  const slower: Result = { moves: 15, elapsedMs: 65_900 };
  const faster: Result = { moves: 15, elapsedMs: 65_200 };
  assert.equal(pickWinner({ seed: 2, result: slower }, { seed: 3, result: faster }), 3);
  assert.equal(pickWinner({ seed: 3, result: faster }, { seed: 2, result: slower }), 3);
});

test('equal moves and time go to the higher seed whichever plays first', () => {
  const same: Result = { moves: 15, elapsedMs: 65_200 };
  assert.equal(pickWinner({ seed: 1, result: same }, { seed: 4, result: same }), 1);
  assert.equal(pickWinner({ seed: 4, result: same }, { seed: 1, result: same }), 1);
});

test('turns run in match order and a match needs both results', () => {
  let tournament = createTournament(FOUR, CODES.slice(0, 3));
  assert.deepEqual(nextTurn(tournament), { match: 0, seat: 0 });
  tournament = recordResult(tournament, { moves: 10, elapsedMs: 1000 });
  assert.deepEqual(nextTurn(tournament), { match: 0, seat: 1 });
  assert.equal(winnerOf(tournament, 0), null);
  tournament = recordResult(tournament, { moves: 11, elapsedMs: 900 });
  assert.equal(winnerOf(tournament, 0), 1);
  assert.deepEqual(nextTurn(tournament), { match: 1, seat: 0 });
});

test('winners meet in later rounds, better seed first, until a champion remains', () => {
  const start = createTournament(EIGHT, CODES);
  const quarterfinals = playOut(start, 8);
  assert.deepEqual(opponents(quarterfinals, 4), ['Ada', 'Dev']);
  assert.deepEqual(opponents(quarterfinals, 5), ['Bo', 'Cora']);
  const semifinals = playOut(start, 12);
  assert.deepEqual(opponents(semifinals, 6), ['Ada', 'Bo']);
  assert.equal(isFinished(semifinals), false);
  const finished = playOut(start);
  assert.equal(nextTurn(finished), null);
  assert.equal(isFinished(finished), true);
  assert.equal(nameOf(finished, championOf(finished)), 'Ada');
  assert.equal(nameOf(finished, runnerUpOf(finished)), 'Bo');
});

test('a tournament without matches has no turn and no champion', () => {
  const draft = createTournament(FOUR, []);
  assert.equal(nextTurn(draft), null);
  assert.equal(championOf(draft), null);
  assert.equal(isFinished(draft), false);
});
