import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  bracketRounds,
  champion,
  createTournament,
  isPlayerCount,
  lastTurn,
  matchPlayers,
  matchWinner,
  nextTurn,
  recordTurn,
  RosterProblem,
  rosterProblem,
  turnPlayer,
} from './bracket.ts';
import type { Tournament, TurnResult } from './bracket.ts';

const FOUR = ['Ann', 'Ben', 'Cy', 'Di'];
const EIGHT = [...FOUR, 'Ed', 'Flo', 'Gus', 'Hal'];

function played(tournament: Tournament, results: readonly TurnResult[]): Tournament {
  return results.reduce(recordTurn, tournament);
}

function codes(count: number): string[] {
  return Array.from({ length: count - 1 }, (_, index) => `np1-4-${index + 1}`);
}

test('only four or eight players make a knockout and each match has its own deal', () => {
  assert.deepEqual([3, 4, 5, 8, 16].map(isPlayerCount), [false, true, false, true, false]);
  assert.throws(() => createTournament(['Ann', 'Ben'], ['np1-4-1']));
  assert.throws(() => createTournament(FOUR, codes(8)));
  const tournament = createTournament(FOUR, codes(4));
  assert.deepEqual(
    tournament.matches.map((match) => match.boardCode),
    ['np1-4-1', 'np1-4-2', 'np1-4-3'],
  );
  assert.ok(tournament.matches.every((match) => match.results.every((slot) => slot === null)));
});

test('round one pairs neighbours and later matches wait for the winners of earlier ones', () => {
  assert.deepEqual(bracketRounds(4), [[0, 1], [2]]);
  assert.deepEqual(bracketRounds(8), [[0, 1, 2, 3], [4, 5], [6]]);
  const tournament = createTournament(EIGHT, codes(8));
  assert.deepEqual(
    [0, 1, 2, 3].map((match) => matchPlayers(tournament, match)),
    [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ],
  );
  assert.deepEqual(matchPlayers(tournament, 4), [null, null]);
  const quarterfinals = played(tournament, [
    { moves: 9, elapsedMs: 1 },
    { moves: 8, elapsedMs: 1 },
    { moves: 8, elapsedMs: 1 },
    { moves: 9, elapsedMs: 1 },
  ]);
  assert.deepEqual(matchPlayers(quarterfinals, 4), [1, 2]);
  assert.deepEqual(matchPlayers(quarterfinals, 6), [null, null]);
});

test('fewer moves wins, equal moves go to the faster time and an exact tie to the first player', () => {
  const tournament = createTournament(FOUR, codes(4));
  const winner = (first: TurnResult, second: TurnResult) =>
    matchWinner(played(tournament, [first, second]), 0);
  assert.equal(winner({ moves: 8, elapsedMs: 9000 }, { moves: 9, elapsedMs: 1000 }), 0);
  assert.equal(winner({ moves: 10, elapsedMs: 1000 }, { moves: 9, elapsedMs: 9000 }), 1);
  assert.equal(winner({ moves: 9, elapsedMs: 3001 }, { moves: 9, elapsedMs: 3000 }), 1);
  assert.equal(winner({ moves: 9, elapsedMs: 3000 }, { moves: 9, elapsedMs: 3000 }), 0);
  assert.equal(matchWinner(played(tournament, [{ moves: 8, elapsedMs: 1 }]), 0), null);
});

test('turns run in match order with the first seat first and the final decides the champion', () => {
  let tournament = createTournament(FOUR, codes(4));
  assert.equal(lastTurn(tournament), null);
  const order: (number | null)[] = [];
  for (const moves of [8, 9, 12, 10, 11, 9]) {
    const turn = nextTurn(tournament);
    assert.ok(turn);
    order.push(turnPlayer(tournament, turn));
    assert.equal(champion(tournament), null);
    tournament = recordTurn(tournament, { moves, elapsedMs: 1000 });
    assert.deepEqual(lastTurn(tournament), turn);
  }
  assert.deepEqual(order, [0, 1, 2, 3, 0, 3]);
  assert.equal(nextTurn(tournament), null);
  assert.equal(champion(tournament), 3);
  assert.equal(recordTurn(tournament, { moves: 8, elapsedMs: 1 }), tournament);
});

test('rosters need a name for each player and names that differ beyond letter case', () => {
  assert.equal(rosterProblem(FOUR), null);
  assert.deepEqual(rosterProblem(['Ann', '', 'Cy', '']), { kind: RosterProblem.missing, index: 1 });
  assert.deepEqual(rosterProblem(['Ann', 'Ben', 'ann', 'Di']), {
    kind: RosterProblem.duplicate,
    index: 2,
  });
});
