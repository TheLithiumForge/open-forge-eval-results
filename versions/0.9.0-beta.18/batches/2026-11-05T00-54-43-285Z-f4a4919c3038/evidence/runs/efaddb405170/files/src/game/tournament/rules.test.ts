import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from '../game.ts';
import {
  advanceTournament,
  createTournament,
  matchPlayers,
  matchStage,
  matchWinner,
  normalizeName,
  recordGame,
  startTurn,
  TournamentPhase,
  validateNames,
} from './rules.ts';
import type { TournamentState } from './rules.ts';

const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];
const EIGHT = [...FOUR, 'Emi', 'Finn', 'Gia', 'Hal'];

function event(players = FOUR): TournamentState {
  return createTournament(
    players,
    Array.from(
      { length: players.length - 1 },
      (_, index) => `np1-${matchStage(players.length, index).size}-${index + 1}`,
    ),
  );
}

function finish(state: TournamentState, milliseconds = 0): TournamentState {
  const started = startTurn(state);
  let game = started.game;
  assert.ok(game);
  const pairs = new Map<number, number[]>();
  game.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
  for (const pair of pairs.values())
    for (const index of pair) {
      game = advanceGame(activateCard(game, index), milliseconds);
    }
  return recordGame(started, game);
}

test('names normalize spaces and NFC, count Unicode code points and reject repeated names', () => {
  assert.equal(normalizeName('  Cafe\u0301\t  Joy  '), 'Café Joy');
  assert.deepEqual(validateNames(['A😀', '😀'.repeat(20)]).names, ['A😀', '😀'.repeat(20)]);
  for (const name of ['', ' A ', '😀', '😀'.repeat(21)])
    assert.equal(validateNames([name]).error, 'Use 2 to 20 characters.');
  assert.equal(validateNames([' Café ', 'CAFE\u0301']).error, 'Each name must be different.');
});

test('opening pairings and rounds follow entry seeds for four and eight players', () => {
  assert.deepEqual(
    [0, 1].map((index) => matchPlayers(event(), index)),
    [
      [0, 3],
      [1, 2],
    ],
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((index) => matchPlayers(event(EIGHT), index)),
    [
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ],
  );
  assert.deepEqual(
    [0, 1, 2].map((index) => matchStage(4, index)),
    [
      { round: 'Semifinal', size: 6 },
      { round: 'Semifinal', size: 6 },
      { round: 'Final', size: 8 },
    ],
  );
});

test('a match compares moves, then fractional active time, then the highest entry seed', () => {
  const state = event();
  const match = state.matches[0];
  assert.ok(match);
  for (const [left, right, winner] of [
    [{ moves: 18, elapsedMs: 2000 }, { moves: 19, elapsedMs: 0 }, 0],
    [{ moves: 18, elapsedMs: 2.5 }, { moves: 18, elapsedMs: 2.4 }, 3],
    [{ moves: 18, elapsedMs: 2.5 }, { moves: 18, elapsedMs: 2.5 }, 0],
  ] as const) {
    assert.equal(
      matchWinner({ ...state, matches: [{ ...match, results: [left, right] }] }, 0),
      winner,
    );
  }
});

test('turn handoffs reset progress on the same deal and both bracket sizes reach a champion', () => {
  for (const players of [FOUR, EIGHT]) {
    let state = event(players);
    while (state.phase !== TournamentPhase.complete) {
      const before = state;
      state = finish(state);
      assert.equal(before.matches[before.currentMatch]?.results.length, 0);
      assert.equal(state.phase, TournamentPhase.turnResult);
      const code = state.game?.boardCode;
      state = advanceTournament(state);
      assert.equal(state.game, null);
      assert.equal(startTurn(state).game?.boardCode, code);
      state = finish(state);
      assert.equal(state.matches[state.currentMatch]?.results.length, 2);
      if (state.phase !== TournamentPhase.complete) state = advanceTournament(state);
    }
    assert.equal(matchWinner(state, state.currentMatch), 0);
    assert.equal(state.currentMatch, players.length - 2);
    assert.equal(new Set(state.matches.map((match) => match.boardCode)).size, players.length - 1);
  }
});

test('unfinished games and stale deals cannot submit a result or skip a handoff', () => {
  const state = event();
  assert.equal(advanceTournament(state), state);
  assert.equal(recordGame(state, createGame('np1-6-1')), state);
  const playing = startTurn(state);
  assert.equal(recordGame(playing, createGame('np1-6-2')), playing);
  assert.equal(recordGame(playing, createGame('np1-6-1')).matches[0]?.results.length, 0);
});
