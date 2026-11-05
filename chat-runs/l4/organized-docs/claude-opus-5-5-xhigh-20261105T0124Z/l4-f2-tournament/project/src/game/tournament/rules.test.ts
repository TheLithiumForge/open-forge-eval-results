import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import {
  champion,
  createTournament,
  currentTurn,
  isAhead,
  isFinished,
  isValidTournament,
  matchSeeds,
  matchWinner,
  playerName,
  recordResult,
} from './rules.ts';
import type { Tournament } from './rules.ts';

const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
const FOUR = EIGHT.slice(0, 4);

function counting(): (size: number) => string {
  let seed = 0;
  return (size) => boardCode(size, (seed += 1));
}

function opening(tournament: Tournament): string[][] {
  return tournament.matches
    .map((_, index) => matchSeeds(tournament, index))
    .filter((seeds) => seeds !== null)
    .map((seeds) => seeds.map((seed) => playerName(tournament, seed)));
}

function play(tournament: Tournament, moves: readonly number[]): Tournament {
  return moves.reduce(
    (next, count) => recordResult(next, { moves: count, elapsedMs: 1000 }),
    tournament,
  );
}

test('opening matches follow entry-order seeds for eight and four players', () => {
  assert.deepEqual(opening(createTournament(EIGHT, counting())), [
    ['Ada', 'Hal'],
    ['Dev', 'Emi'],
    ['Cora', 'Finn'],
    ['Bo', 'Gia'],
  ]);
  assert.deepEqual(opening(createTournament(FOUR, counting())), [
    ['Ada', 'Dev'],
    ['Bo', 'Cora'],
  ]);
});

test('fewer moves win, then lower active time, then the higher seed', () => {
  assert.equal(
    isAhead({ moves: 12, elapsedMs: 70200 }, { moves: 13, elapsedMs: 58100 }, 2, 1),
    true,
  );
  assert.equal(
    isAhead({ moves: 15, elapsedMs: 65200 }, { moves: 15, elapsedMs: 65900 }, 4, 3),
    true,
  );
  assert.equal(
    isAhead({ moves: 15, elapsedMs: 65900.5 }, { moves: 15, elapsedMs: 65900.25 }, 1, 2),
    false,
  );
  const equal = { moves: 8, elapsedMs: 5000 };
  assert.equal(isAhead(equal, equal, 1, 4), true);
  assert.equal(isAhead(equal, equal, 4, 1), false);
});

test('players take turns match by match and winners meet in bracket order', () => {
  const start = createTournament(FOUR, counting());
  assert.deepEqual(currentTurn(start), { match: 0, seat: 0 });
  const firstGame = play(start, [20]);
  assert.deepEqual(currentTurn(firstGame), { match: 0, seat: 1 });
  assert.equal(matchSeeds(firstGame, 2), null);
  // Dev beats Ada on moves, and Bo beats Cora on the higher seed after equal results.
  const semifinals = play(start, [20, 18, 18, 18]);
  assert.equal(matchWinner(semifinals, 0), 4);
  assert.equal(matchWinner(semifinals, 1), 2);
  assert.deepEqual(matchSeeds(semifinals, 2), [4, 2]);
  assert.deepEqual(currentTurn(semifinals), { match: 2, seat: 0 });
  assert.equal(champion(semifinals), null);
  const finished = play(semifinals, [40, 32]);
  assert.equal(isFinished(finished), true);
  assert.equal(currentTurn(finished), null);
  assert.equal(champion(finished), 'Bo');
  assert.equal(recordResult(finished, { moves: 32, elapsedMs: 1 }), finished);
});

test('every match draws a different full board code at its round size', () => {
  const seeds = [4, 4, 5, 5, 6, 6, 7, 7, 7, 8, 8];
  let draw = 0;
  const tournament = createTournament(EIGHT, (size) => boardCode(size, seeds[draw++] ?? 99));
  // A repeated seed draws again within a size. np1-6-7 differs from np1-4-7 by its size.
  assert.deepEqual(
    tournament.matches.map((match) => match.boardCode),
    ['np1-4-4', 'np1-4-5', 'np1-4-6', 'np1-4-7', 'np1-6-7', 'np1-6-8', 'np1-8-8'],
  );
  assert.equal(isValidTournament(tournament), true);
});

test('validation rejects impossible brackets, deals and results', () => {
  const valid = play(createTournament(FOUR, counting()), [20, 18]);
  assert.equal(isValidTournament(valid), true);
  const [first, second, final] = valid.matches;
  if (!first || !second || !final) throw new Error('Expected three matches.');
  const cases: Tournament[] = [
    { ...valid, players: [...FOUR, 'Emi'] },
    { ...valid, players: ['Ada', 'ada', 'Cora', 'Dev'] },
    { ...valid, players: [' Ada', 'Bo', 'Cora', 'Dev'] },
    { ...valid, matches: [first, { ...second, boardCode: first.boardCode }, final] },
    { ...valid, matches: [first, { ...second, boardCode: 'np1-4-77' }, final] },
    { ...valid, matches: [{ ...first, results: [null, first.results[1] ?? null] }, second, final] },
    {
      ...valid,
      matches: [{ ...first, results: [{ moves: 17, elapsedMs: 1 }, null] }, second, final],
    },
    {
      ...valid,
      matches: [{ ...first, results: [{ moves: 18, elapsedMs: -1 }, null] }, second, final],
    },
    { ...valid, matches: [first, second] },
  ];
  for (const tournament of cases) assert.equal(isValidTournament(tournament), false);
});
