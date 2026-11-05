import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  acceptedName,
  championOf,
  checkNames,
  createTournament,
  currentTurn,
  matchLabel,
  matchPlayers,
  matchSizes,
  matchWinner,
  NameNotice,
  recordResult,
  RoundName,
  roundName,
  turnPlayer,
} from './rules.ts';
import type { Result, Tournament } from './rules.ts';

const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];

// Deals every match from a counter, so each code is distinct and readable.
function tournamentOf(players: readonly string[]): Tournament {
  let seed = 0;
  return createTournament(players, (size) => `np1-${size}-${(seed += 1)}`);
}

function names(tournament: Tournament, index: number): (string | undefined)[] {
  return matchPlayers(tournament, index).map((entry) =>
    entry === null ? undefined : tournament.players[entry],
  );
}

function play(tournament: Tournament, results: readonly Result[]): Tournament {
  return results.reduce(recordResult, tournament);
}

test('opening matches follow entry seeds in bracket order for both bracket sizes', () => {
  const eight = tournamentOf(EIGHT);
  assert.deepEqual(
    [0, 1, 2, 3].map((index) => names(eight, index)),
    [
      ['Ada', 'Hal'],
      ['Dev', 'Emi'],
      ['Cora', 'Finn'],
      ['Bo', 'Gia'],
    ],
  );
  const four = tournamentOf(FOUR);
  assert.deepEqual(
    [0, 1].map((index) => names(four, index)),
    [
      ['Ada', 'Dev'],
      ['Bo', 'Cora'],
    ],
  );
  assert.deepEqual(names(four, 2), [undefined, undefined]);
});

test('rounds are named by stage and deal 4x4, 6x6 and 8x8 boards', () => {
  assert.deepEqual(matchSizes(8), [4, 4, 4, 4, 6, 6, 8]);
  assert.deepEqual(matchSizes(4), [6, 6, 8]);
  assert.deepEqual(
    [0, 3, 4, 6].map((index) => roundName(8, index)),
    [RoundName.quarterfinal, 'Quarterfinal', 'Semifinal', 'Final'],
  );
  assert.deepEqual(
    [0, 1, 2].map((index) => roundName(4, index)),
    ['Semifinal', 'Semifinal', 'Final'],
  );
  assert.deepEqual(
    [0, 3, 5, 6].map((index) => matchLabel(8, index)),
    ['Quarterfinal 1', 'Quarterfinal 4', 'Semifinal 2', 'Final'],
  );
});

test('every match gets a different board code even when a draw repeats', () => {
  const draws = ['np1-6-5', 'np1-6-5', 'np1-6-9', 'np1-8-5'];
  const tournament = createTournament(FOUR, () => draws.shift() ?? 'np1-8-1');
  assert.deepEqual(
    tournament.matches.map((match) => match.boardCode),
    ['np1-6-5', 'np1-6-9', 'np1-8-5'],
  );
});

test('fewer moves wins first, then less active time, then the higher seed', () => {
  const four = tournamentOf(FOUR);
  const byMoves = play(four, [
    { moves: 12, elapsedMs: 70_200 },
    { moves: 13, elapsedMs: 58_100 },
  ]);
  assert.equal(matchWinner(byMoves, 0), 0);
  const byTime = play(byMoves, [
    { moves: 15, elapsedMs: 65_900 },
    { moves: 15, elapsedMs: 65_200 },
  ]);
  assert.equal(matchWinner(byTime, 1), 2);
  const fractional = play(four, [
    { moves: 15, elapsedMs: 65_200.7 },
    { moves: 15, elapsedMs: 65_200.3 },
  ]);
  assert.equal(matchWinner(fractional, 0), 3);
  const equal = play(four, [
    { moves: 15, elapsedMs: 65_200 },
    { moves: 15, elapsedMs: 65_200 },
  ]);
  assert.equal(matchWinner(equal, 0), 0);
});

test('a later match lists winners in bracket order and an equal result goes to the higher seed', () => {
  const same = { moves: 18, elapsedMs: 40_000 };
  const final = play(tournamentOf(FOUR), [
    { moves: 20, elapsedMs: 1 },
    { moves: 18, elapsedMs: 1 },
    same,
    { moves: 19, elapsedMs: 1 },
  ]);
  assert.deepEqual(names(final, 2), ['Dev', 'Bo']);
  assert.equal(turnPlayer(final), 'Dev');
  const done = play(final, [same, same]);
  assert.equal(championOf(done), 1);
  assert.equal(currentTurn(done), null);
  assert.equal(recordResult(done, same), done);
});

test('turns run through each match in order until a champion is decided', () => {
  let tournament = tournamentOf(EIGHT);
  const order: string[] = [];
  for (let game = 0; game < 14; game += 1) {
    order.push(turnPlayer(tournament) ?? '');
    tournament = recordResult(tournament, { moves: 40 - game, elapsedMs: 1000 });
  }
  assert.deepEqual(order.slice(0, 8), ['Ada', 'Hal', 'Dev', 'Emi', 'Cora', 'Finn', 'Bo', 'Gia']);
  assert.deepEqual(order.slice(8), ['Hal', 'Emi', 'Finn', 'Gia', 'Emi', 'Gia']);
  assert.equal(tournament.players[championOf(tournament) ?? -1], 'Gia');
  assert.equal(championOf(tournamentOf(EIGHT)), null);
});

test('a typed name is trimmed, collapsed and composed before it is checked', () => {
  assert.equal(acceptedName('  Mira  '), 'Mira');
  assert.equal(acceptedName('Ada   Lovelace'), 'Ada Lovelace');
  assert.equal(acceptedName('Jean\tLuc'), 'Jean Luc');
  assert.equal(acceptedName('Café'), 'Café');
  assert.equal(acceptedName("O'Neil"), "O'Neil");
  assert.equal(acceptedName(acceptedName(' Ada  Lovelace ')), 'Ada Lovelace');
});

test('names need 2 to 20 code points after normalization', () => {
  const lengthFails = (name: string) => checkNames([name, 'Other']);
  for (const name of ['', 'A', '   A   ', 'A'.repeat(21)])
    assert.deepEqual(lengthFails(name), { notice: NameNotice.length, index: 0 });
  for (const name of ['Al', 'A\u{1F600}', 'A'.repeat(20), '\u{1F600}'.repeat(20), ' Al '])
    assert.ok('names' in lengthFails(name), name);
  assert.equal(NameNotice.length, 'Use 2 to 20 characters.');
});

test('names in one group must differ without regard to case', () => {
  assert.deepEqual(checkNames(['Mira', 'Ada', 'Bo', 'MIRA']), {
    notice: 'Each name must be different.',
    index: 3,
  });
  assert.deepEqual(checkNames(['mira', ' Mira ']), { notice: NameNotice.repeat, index: 1 });
  assert.deepEqual(checkNames(['Mira', 'Ada', 'Bo', 'Cora']), {
    names: ['Mira', 'Ada', 'Bo', 'Cora'],
  });
  assert.deepEqual(checkNames(['Mira', 'M', 'mira']), { notice: NameNotice.length, index: 1 });
});
