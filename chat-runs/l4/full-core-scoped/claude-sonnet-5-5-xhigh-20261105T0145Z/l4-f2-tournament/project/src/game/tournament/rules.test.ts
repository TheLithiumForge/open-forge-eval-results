import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import {
  champion,
  createTournament,
  dealSizes,
  hasValidDeals,
  matchPlayers,
  matchWinner,
  nextTurn,
  recordResult,
  roundNames,
  turnPlayer,
} from './rules.ts';
import type { Result, Tournament } from './rules.ts';

const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];

function codesFor(count: number): string[] {
  return dealSizes(count).map((size, index) => boardCode(size, index + 1));
}

function names(tournament: Tournament, index: number): (string | null)[] {
  return matchPlayers(tournament, index).map((seed) =>
    seed === null ? null : (tournament.players[seed] ?? null),
  );
}

// Plays every remaining turn. Each player's result comes from the supplied function.
function play(tournament: Tournament, result: (seed: number, match: number) => Result): Tournament {
  let current = tournament;
  for (let turn = nextTurn(current); turn; turn = nextTurn(current)) {
    const seed = turnPlayer(current, turn);
    assert.notEqual(seed, null);
    current = recordResult(current, turn, result(seed ?? 0, turn.match));
  }
  return current;
}

test('eight entrants open as one against eight, four against five, three against six, two against seven', () => {
  const tournament = createTournament(EIGHT, codesFor(8));
  assert.deepEqual(
    [0, 1, 2, 3].map((index) => names(tournament, index)),
    [
      ['Ada', 'Hal'],
      ['Dev', 'Emi'],
      ['Cora', 'Finn'],
      ['Bo', 'Gia'],
    ],
  );
  assert.deepEqual(names(tournament, 4), [null, null]);
});

test('four entrants open as one against four, then two against three', () => {
  const tournament = createTournament(FOUR, codesFor(4));
  assert.deepEqual(
    [0, 1].map((index) => names(tournament, index)),
    [
      ['Ada', 'Dev'],
      ['Bo', 'Cora'],
    ],
  );
});

test('rounds are named by stage and boards grow from 4x4 to 6x6 to 8x8', () => {
  assert.deepEqual(roundNames(8), ['Quarterfinal', 'Semifinal', 'Final']);
  assert.deepEqual(roundNames(4), ['Semifinal', 'Final']);
  assert.deepEqual(dealSizes(8), [4, 4, 4, 4, 6, 6, 8]);
  assert.deepEqual(dealSizes(4), [6, 6, 8]);
});

test('every match needs its own full board code at the size of its stage', () => {
  const codes = codesFor(4);
  assert.equal(hasValidDeals(4, codes), true);
  assert.equal(hasValidDeals(4, [codes[0] ?? '', codes[0] ?? '', codes[2] ?? '']), false);
  assert.equal(hasValidDeals(4, ['np1-4-1', 'np1-6-2', 'np1-8-3']), false);
  assert.equal(hasValidDeals(4, codes.slice(0, 2)), false);
  assert.throws(() => createTournament(FOUR, codes.slice(0, 2)));
  assert.throws(() => createTournament(EIGHT.slice(0, 5), codes));
});

test('fewer moves win even when the other player was faster', () => {
  const tournament = createTournament(FOUR, codesFor(4));
  const done = play(tournament, (seed, match) =>
    match === 0
      ? seed === 0
        ? { moves: 12, elapsedMs: 70_200 }
        : { moves: 13, elapsedMs: 58_100 }
      : { moves: 20 + seed, elapsedMs: 1000 },
  );
  assert.equal(matchWinner(done, 0), 0);
});

test('equal moves go to the lower active time', () => {
  const tournament = createTournament(FOUR, codesFor(4));
  const done = play(tournament, (seed, match) =>
    match === 0
      ? { moves: 15, elapsedMs: seed === 0 ? 65_900 : 65_200 }
      : { moves: 20 + seed, elapsedMs: 1000 },
  );
  assert.equal(matchWinner(done, 0), 3);
});

test('equal moves and active time go to the higher seed', () => {
  const tournament = createTournament(FOUR, codesFor(4));
  const done = play(tournament, () => ({ moves: 18, elapsedMs: 40_000 }));
  assert.deepEqual([matchWinner(done, 0), matchWinner(done, 1)], [0, 1]);
  assert.equal(champion(done), 0);
});

test('time is compared in milliseconds rather than as shown on screen', () => {
  const tournament = createTournament(FOUR, codesFor(4));
  const done = play(tournament, (seed, match) =>
    match === 0
      ? { moves: 15, elapsedMs: seed === 0 ? 65_999 : 65_001 }
      : { moves: 20 + seed, elapsedMs: 1000 },
  );
  assert.equal(matchWinner(done, 0), 3);
});

test('winners advance in bracket order to the final and a champion is named at the end', () => {
  let tournament = createTournament(EIGHT, codesFor(8));
  const seen: string[] = [];
  for (let turn = nextTurn(tournament); turn; turn = nextTurn(tournament)) {
    const seed = turnPlayer(tournament, turn) ?? 0;
    seen.push(`${turn.match}:${turn.slot}:${tournament.players[seed]}`);
    // Lower seeds finish in fewer moves, so the top seeds win every match.
    tournament = recordResult(tournament, turn, { moves: 10 + seed, elapsedMs: 1000 * seed });
    assert.equal(champion(tournament) === null, nextTurn(tournament) !== null);
  }
  assert.deepEqual(names(tournament, 4), ['Ada', 'Dev']);
  assert.deepEqual(names(tournament, 5), ['Cora', 'Bo']);
  assert.deepEqual(names(tournament, 6), ['Ada', 'Bo']);
  assert.equal(seen.length, 14);
  assert.equal(seen[0], '0:0:Ada');
  assert.equal(seen[1], '0:1:Hal');
  assert.equal(champion(tournament), 0);
});

test('a result is recorded without changing the earlier tournament', () => {
  const tournament = createTournament(FOUR, codesFor(4));
  const turn = nextTurn(tournament);
  assert.deepEqual(turn, { match: 0, slot: 0 });
  const next = recordResult(tournament, { match: 0, slot: 0 }, { moves: 9, elapsedMs: 5 });
  assert.deepEqual(tournament.matches[0]?.results, [null, null]);
  assert.deepEqual(next.matches[0]?.results, [{ moves: 9, elapsedMs: 5 }, null]);
  assert.deepEqual(nextTurn(next), { match: 0, slot: 1 });
  assert.equal(matchWinner(next, 0), null);
  assert.equal(champion(next), null);
});
