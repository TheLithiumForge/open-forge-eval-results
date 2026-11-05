import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame, isWon } from '../game.ts';
import { generateBoard } from '../deck.ts';
import {
  champion,
  completedGame,
  continueTournament,
  isFinished,
  lastTurn,
  matchLabel,
  matchPlayers,
  matchSizes,
  matchWinner,
  nextTurn,
  recordResult,
  roundName,
  RoundName,
  startTournament,
} from './rules.ts';
import type { GameState } from '../game.ts';
import type { Tournament } from './rules.ts';

const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];
const EIGHT_CODES = ['np1-4-1', 'np1-4-2', 'np1-4-3', 'np1-4-4', 'np1-6-1', 'np1-6-2', 'np1-8-1'];
const FOUR_CODES = ['np1-6-1', 'np1-6-2', 'np1-8-1'];

function names(tournament: Tournament, match: number): (string | undefined)[] {
  return matchPlayers(tournament, match).map((player) =>
    player === null ? undefined : tournament.players[player],
  );
}

// Finishes a board with one move per pair, then adds extra moves and time.
function finished(code: string, extraMoves: number, elapsedMs: number): GameState {
  let game = createGame(code);
  const deck = generateBoard(code).deck;
  for (let face = 0; face < deck.length / 2; face += 1)
    for (const [index, value] of deck.entries())
      if (value === face) game = activateCard(game, index);
  assert.ok(isWon(game));
  return { ...game, moves: game.moves + extraMoves, elapsedMs };
}

function play(tournament: Tournament, extraMoves: number, elapsedMs: number): Tournament {
  const turn = nextTurn(tournament);
  assert.ok(turn);
  return continueTournament(
    recordResult(tournament, finished(turn.boardCode, extraMoves, elapsedMs)),
  );
}

test('eight entrants open with Ada and Hal, Dev and Emi, Cora and Finn, then Bo and Gia', () => {
  const tournament = startTournament(EIGHT, EIGHT_CODES);
  assert.deepEqual(
    [0, 1, 2, 3].map((match) => names(tournament, match)),
    [
      ['Ada', 'Hal'],
      ['Dev', 'Emi'],
      ['Cora', 'Finn'],
      ['Bo', 'Gia'],
    ],
  );
  assert.deepEqual(names(tournament, 4), [undefined, undefined]);
});

test('four entrants open with Ada and Dev, then Bo and Cora', () => {
  const tournament = startTournament(FOUR, FOUR_CODES);
  assert.deepEqual(names(tournament, 0), ['Ada', 'Dev']);
  assert.deepEqual(names(tournament, 1), ['Bo', 'Cora']);
});

test('rounds are named by stage and play 4x4, 6x6 and 8x8 boards', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((match) => roundName(8, match)),
    [
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Semifinal',
      'Semifinal',
    ].concat('Final'),
  );
  assert.deepEqual(
    [0, 1, 2].map((match) => roundName(4, match)),
    [RoundName.semifinal, RoundName.semifinal, RoundName.final],
  );
  assert.deepEqual(matchSizes(8), [4, 4, 4, 4, 6, 6, 8]);
  assert.deepEqual(matchSizes(4), [6, 6, 8]);
  assert.deepEqual(
    [0, 3, 4, 5, 6].map((match) => matchLabel(8, match)),
    ['Quarterfinal 1', 'Quarterfinal 4', 'Semifinal 1', 'Semifinal 2', 'Final'],
  );
  assert.deepEqual(
    [0, 1, 2].map((match) => matchLabel(4, match)),
    ['Semifinal 1', 'Semifinal 2', 'Final'],
  );
});

test('fewer moves wins before time is considered', () => {
  // Ada finishes in 20 moves and 70.2s. Dev is faster but takes 21 moves.
  let tournament = play(startTournament(FOUR, FOUR_CODES), 2, 70_200);
  assert.equal(lastTurn(tournament)?.player, 0);
  assert.equal(matchWinner(tournament, 0), null, 'one result decides nothing');
  tournament = play(tournament, 3, 58_100);
  assert.equal(matchWinner(tournament, 0), 0);
});

test('equal moves go to the lower active time, kept to the fraction', () => {
  const tournament = play(play(startTournament(FOUR, FOUR_CODES), 0, 65_900.5), 0, 65_900.25);
  assert.equal(matchWinner(tournament, 0), 3, 'Dev is faster');
});

test('equal moves and time go to the higher seed', () => {
  const ahead = play(play(startTournament(FOUR, FOUR_CODES), 1, 5000), 1, 5000);
  assert.equal(matchWinner(ahead, 0), 0, 'seed 1 beats seed 4');
  const first = play(ahead, 4, 9000);
  const second = play(first, 4, 9000);
  assert.equal(matchWinner(second, 1), 1, 'seed 2 beats seed 3');
  assert.deepEqual(names(second, 2), ['Ada', 'Bo']);
});

test('turns run match by match, and the final decides the champion', () => {
  let tournament = startTournament(FOUR, FOUR_CODES);
  assert.equal(nextTurn(tournament)?.player, 0);
  assert.equal(lastTurn(tournament), null);
  const reviewed = recordResult(tournament, finished('np1-6-1', 0, 1000));
  assert.equal(reviewed.reviewing, true);
  tournament = continueTournament(reviewed);
  assert.deepEqual(nextTurn(tournament), { match: 0, slot: 1, player: 3, boardCode: 'np1-6-1' });
  tournament = play(tournament, 1, 1000);
  assert.deepEqual(nextTurn(tournament), { match: 1, slot: 0, player: 1, boardCode: 'np1-6-2' });
  tournament = play(play(tournament, 2, 1000), 0, 1000);
  assert.deepEqual(names(tournament, 2), ['Ada', 'Cora']);
  tournament = play(tournament, 5, 1000);
  assert.equal(isFinished(tournament), false);
  const last = recordResult(tournament, finished('np1-8-1', 3, 1000));
  assert.equal(isFinished(last), true);
  assert.equal(last.reviewing, false, 'the end shows the champion rather than a review');
  assert.equal(champion(last), 2);
  assert.equal(nextTurn(last), null);
});

test('a result needs a won game on the current deal', () => {
  const tournament = startTournament(FOUR, FOUR_CODES);
  assert.equal(recordResult(tournament, createGame('np1-6-1')), tournament);
  assert.equal(recordResult(tournament, finished('np1-6-2', 0, 1000)), tournament);
});

test('a completed game rebuilds every matched card with its result', () => {
  const game = completedGame('np1-6-1', { moves: 20, elapsedMs: 4321.5 });
  assert.ok(isWon(game));
  assert.equal(game.moves, 20);
  assert.equal(game.elapsedMs, 4321.5);
  assert.equal(game.started, true);
});
