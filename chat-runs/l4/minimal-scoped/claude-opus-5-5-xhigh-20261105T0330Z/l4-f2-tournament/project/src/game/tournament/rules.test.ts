import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode, parseBoardCode } from '../deck.ts';
import {
  acceptedName,
  champion,
  createTournament,
  currentTurn,
  matchWinner,
  nameProblem,
  NameNotice,
  recordResult,
  Round,
  roundNames,
} from './rules.ts';
import { countingDraw, EIGHT, finishedTournament, FOUR, playAll } from './tournament.fixture.ts';
import type { Match, Tournament } from './rules.ts';

function opening(tournament: Tournament): string[][] {
  return (tournament.rounds[0] ?? []).map((match) =>
    match.players.map((player) => tournament.players[player] ?? ''),
  );
}

test('seeds follow entry order in the opening matches of both bracket sizes', () => {
  assert.deepEqual(opening(createTournament(EIGHT, countingDraw())), [
    ['Ada', 'Hal'],
    ['Dev', 'Emi'],
    ['Cora', 'Finn'],
    ['Bo', 'Gia'],
  ]);
  assert.deepEqual(opening(createTournament(FOUR, countingDraw())), [
    ['Ada', 'Dev'],
    ['Bo', 'Cora'],
  ]);
});

test('rounds are named by stage and play on 4x4, 6x6 and 8x8 boards', () => {
  assert.deepEqual(roundNames(8), [Round.quarterfinal, Round.semifinal, Round.final]);
  assert.deepEqual(roundNames(4), [Round.semifinal, Round.final]);
  const sizes = (tournament: Tournament) =>
    tournament.rounds.map((matches) =>
      matches.map((match) => parseBoardCode(match.boardCode)?.size),
    );
  assert.deepEqual(sizes(finishedTournament(EIGHT)), [[4, 4, 4, 4], [6, 6], [8]]);
  assert.deepEqual(sizes(finishedTournament(FOUR)), [[6, 6], [8]]);
});

test('every match gets its own deal even when the draw repeats a code', () => {
  const draws = ['np1-4-7', 'np1-4-7', 'np1-4-7', 'np1-4-8'];
  let seed = 8;
  const repeating = (size: number) => draws.shift() ?? boardCode(size, (seed += 1));
  const tournament = createTournament(EIGHT, repeating);
  const codes = (tournament.rounds[0] ?? []).map((match) => match.boardCode);
  assert.deepEqual(codes, ['np1-4-7', 'np1-4-8', 'np1-4-9', 'np1-4-10']);
});

test('names are trimmed, inner spaces collapse to one and text is composed', () => {
  assert.equal(acceptedName('  Mira  '), 'Mira');
  assert.equal(acceptedName('Ada \t  Lovelace'), 'Ada Lovelace');
  assert.equal(acceptedName('Café'), 'Café');
  assert.equal(acceptedName("O'Neil"), "O'Neil");
  assert.equal(acceptedName(acceptedName(' Jean   Luc ')), 'Jean Luc');
});

test('a name needs 2 to 20 code points after it is accepted', () => {
  const valid = (name: string) => nameProblem([name, 'Other']) === null;
  assert.equal(valid(''), false);
  assert.equal(valid('A'), false);
  assert.equal(valid('Al'), true);
  assert.equal(valid('A\u{1F600}'), true);
  assert.equal(valid('a'.repeat(20)), true);
  assert.equal(valid('a'.repeat(21)), false);
  assert.equal(valid('\u{1F600}'.repeat(20)), true);
  assert.equal(nameProblem(['A', 'Bo']), NameNotice.length);
});

test('names in one group must differ without regard to case', () => {
  assert.equal(nameProblem(['Mira', 'mira']), NameNotice.repeated);
  assert.equal(nameProblem(['Mira', 'Bo', 'Cora', 'MIRA']), NameNotice.repeated);
  assert.equal(nameProblem(['Mira', 'Bo', 'Cora', 'Dev']), null);
});

function decided(results: Match['results'], players: Match['players'] = [0, 1]): number | null {
  return matchWinner({ boardCode: boardCode(4, 1), players, results });
}

test('fewer moves win, then lower active time, then the higher seed', () => {
  const ada = { moves: 12, elapsedMs: 70200 };
  const bo = { moves: 13, elapsedMs: 58100 };
  assert.equal(decided([ada, bo]), 0);
  const cora = { moves: 15, elapsedMs: 65200 };
  const dev = { moves: 15, elapsedMs: 65900 };
  assert.equal(decided([dev, cora], [3, 2]), 2);
  assert.equal(decided([cora, { ...cora, elapsedMs: 65200.4 }]), 0);
  assert.equal(decided([cora, { ...cora }], [5, 2]), 2);
  assert.equal(decided([cora, null]), null);
});

test('turns run in match order and a finished round adds the next one', () => {
  const draw = countingDraw();
  let tournament = createTournament(FOUR, draw);
  assert.deepEqual(currentTurn(tournament), { round: 0, match: 0, player: 0 });
  tournament = recordResult(tournament, { moves: 20, elapsedMs: 1 }, draw);
  assert.deepEqual(currentTurn(tournament), { round: 0, match: 0, player: 1 });
  tournament = recordResult(tournament, { moves: 19, elapsedMs: 1 }, draw);
  assert.equal(tournament.rounds.length, 1);
  tournament = recordResult(tournament, { moves: 30, elapsedMs: 1 }, draw);
  tournament = recordResult(tournament, { moves: 30, elapsedMs: 1 }, draw);
  assert.equal(tournament.rounds.length, 2);
  assert.deepEqual(tournament.rounds[1]?.[0]?.players, [3, 1]);
  assert.equal(champion(tournament), null);
});

test('the final winner is the champion and a finished tournament takes no more results', () => {
  const tournament = playAll(createTournament(EIGHT, countingDraw()), (player) => ({
    moves: player === 'Gia' ? 32 : 40,
    elapsedMs: 5000,
  }));
  assert.equal(tournament.players[champion(tournament) ?? -1], 'Gia');
  assert.equal(currentTurn(tournament), null);
  assert.equal(recordResult(tournament, { moves: 32, elapsedMs: 1 }, countingDraw()), tournament);
});
