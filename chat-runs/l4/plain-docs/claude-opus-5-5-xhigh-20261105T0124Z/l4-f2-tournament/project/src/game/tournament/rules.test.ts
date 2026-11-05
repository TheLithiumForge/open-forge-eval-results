import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  attemptCount,
  boardSizes,
  champion,
  currentTurn,
  isValidTournament,
  matchLabel,
  matchRound,
  matchSeeds,
  matchWinner,
  playerName,
  recordAttempt,
  RoundName,
} from './rules.ts';
import type { Attempt, Tournament } from './rules.ts';

const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];
const FOUR_CODES = ['np1-6-1', 'np1-6-2', 'np1-8-1'];
const EIGHT_CODES = ['np1-4-1', 'np1-4-2', 'np1-4-3', 'np1-4-4', 'np1-6-1', 'np1-6-2', 'np1-8-1'];

function fresh(players: readonly string[], codes: readonly string[]): Tournament {
  return { players, matches: codes.map((boardCode) => ({ boardCode, attempts: [] })) };
}

function play(tournament: Tournament, attempts: readonly Attempt[]): Tournament {
  return attempts.reduce(recordAttempt, tournament);
}

function opening(tournament: Tournament, matches: number): string[][] {
  return Array.from({ length: matches }, (_, index) =>
    matchSeeds(tournament, index).map((seed) =>
      seed === null ? '' : playerName(tournament, seed),
    ),
  );
}

test('entry order seeds the opening matches of both bracket sizes', () => {
  assert.deepEqual(opening(fresh(EIGHT, EIGHT_CODES), 4), [
    ['Ada', 'Hal'],
    ['Dev', 'Emi'],
    ['Cora', 'Finn'],
    ['Bo', 'Gia'],
  ]);
  assert.deepEqual(opening(fresh(FOUR, FOUR_CODES), 2), [
    ['Ada', 'Dev'],
    ['Bo', 'Cora'],
  ]);
  assert.deepEqual(matchSeeds(fresh(FOUR, FOUR_CODES), 2), [null, null]);
});

test('rounds run quarterfinal, semifinal and final on growing boards', () => {
  assert.deepEqual(
    EIGHT_CODES.map((_, index) => matchRound(8, index)),
    [
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Semifinal',
      'Semifinal',
      'Final',
    ],
  );
  assert.deepEqual(
    FOUR_CODES.map((_, index) => matchRound(4, index)),
    [RoundName.semifinal, RoundName.semifinal, RoundName.final],
  );
  assert.deepEqual(boardSizes(8), [4, 4, 4, 4, 6, 6, 8]);
  assert.deepEqual(boardSizes(4), [6, 6, 8]);
  assert.deepEqual(boardSizes(6), []);
  assert.equal(matchLabel(8, 2), 'Quarterfinal 3');
  assert.equal(matchLabel(8, 5), 'Semifinal 2');
  assert.equal(matchLabel(4, 2), 'Final');
});

test('fewer moves win, then less active time, then the higher seed', () => {
  const start = fresh(FOUR, FOUR_CODES);
  const moves = play(start, [
    { moves: 18, elapsedMs: 70_200 },
    { moves: 19, elapsedMs: 58_100 },
  ]);
  assert.equal(matchWinner(moves, 0), 1);
  const time = play(moves, [
    { moves: 20, elapsedMs: 65_900 },
    { moves: 20, elapsedMs: 65_200 },
  ]);
  assert.equal(matchWinner(time, 1), 3);
  assert.equal(matchWinner(play(start, [{ moves: 18, elapsedMs: 1 }]), 0), null);
  const equal = play(start, [
    { moves: 18, elapsedMs: 1000.25 },
    { moves: 18, elapsedMs: 1000.5 },
  ]);
  assert.equal(matchWinner(equal, 0), 1, 'a quarter millisecond still separates the times');
  const lowSeedFirst = play(start, [
    { moves: 20, elapsedMs: 9000 },
    { moves: 18, elapsedMs: 9000 },
    { moves: 18, elapsedMs: 5000 },
    { moves: 20, elapsedMs: 5000 },
  ]);
  assert.deepEqual(matchSeeds(lowSeedFirst, 2), [4, 2]);
  const tied = play(lowSeedFirst, [
    { moves: 40, elapsedMs: 3000 },
    { moves: 40, elapsedMs: 3000 },
  ]);
  assert.equal(matchWinner(tied, 2), 2, 'seed 2 beats seed 4 although it played second');
  assert.equal(champion(tied), 'Bo');
});

test('turns follow the bracket and the final result names a champion', () => {
  let tournament = fresh(FOUR, FOUR_CODES);
  const players: string[] = [];
  for (let turn = 0; turn < 6; turn += 1) {
    const next = currentTurn(tournament);
    assert.ok(next);
    players.push(`${next.match}:${playerName(tournament, next.seed)}`);
    assert.equal(champion(tournament), null);
    tournament = recordAttempt(tournament, { moves: 40 - turn, elapsedMs: 1000 });
  }
  assert.deepEqual(players, ['0:Ada', '0:Dev', '1:Bo', '1:Cora', '2:Dev', '2:Cora']);
  assert.equal(currentTurn(tournament), null);
  assert.equal(attemptCount(tournament), 6);
  assert.equal(champion(tournament), 'Cora');
  assert.equal(recordAttempt(tournament, { moves: 32, elapsedMs: 1 }), tournament);
});

test('a tournament needs distinct deals at each round size and matches played in order', () => {
  const start = fresh(EIGHT, EIGHT_CODES);
  assert.ok(isValidTournament(start));
  const finished = play(
    start,
    Array.from({ length: 14 }, (_, turn) => ({
      moves: turn < 8 ? 8 : turn < 12 ? 18 : 32,
      elapsedMs: 0,
    })),
  );
  assert.ok(isValidTournament(finished));
  assert.equal(champion(finished), 'Ada');
  const swap = (codes: readonly string[]) => ({ ...start, matches: fresh(EIGHT, codes).matches });
  assert.equal(isValidTournament(swap([...EIGHT_CODES.slice(0, 6), 'np1-6-3'])), false);
  assert.equal(isValidTournament(swap(['np1-4-2', ...EIGHT_CODES.slice(1)])), false);
  assert.equal(isValidTournament(fresh(EIGHT.slice(0, 6), EIGHT_CODES.slice(0, 5))), false);
  assert.equal(isValidTournament(fresh(FOUR, EIGHT_CODES)), false);
  assert.equal(isValidTournament(fresh(['Ada', ' Bo', 'Cora', 'Dev'], FOUR_CODES)), false);
  const skipped = start.matches.map((match, index) =>
    index === 1 ? { ...match, attempts: [{ moves: 8, elapsedMs: 0 }] } : match,
  );
  assert.equal(isValidTournament({ ...start, matches: skipped }), false);
  const quick = play(start, [{ moves: 7, elapsedMs: 0 }]);
  assert.equal(isValidTournament(quick), false, 'eight pairs take at least eight moves');
  assert.equal(isValidTournament(play(start, [{ moves: 8, elapsedMs: -1 }])), false);
  assert.equal(isValidTournament(play(start, [{ moves: 8.5, elapsedMs: 1 }])), false);
});
