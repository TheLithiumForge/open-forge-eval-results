import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame, isWon } from '../game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../game.fixture.ts';
import { activateSession, replaceGame } from '../session/session.ts';
import { finishTurn, initialState, loadedState, screenOf, shownTurn, TurnPhase } from './flow.ts';
import { createTournament } from './rules.ts';
import type { GameState } from '../game.ts';
import type { State } from './flow.ts';

const PLAYERS = ['Ada', 'Bo', 'Cora', 'Dev'];
const CODES = [EXAMPLE_CODE, 'np1-4-2', 'np1-4-3'];

function wonGame(elapsedMs: number): GameState {
  let game = createGame(EXAMPLE_CODE);
  for (const pair of EXAMPLE_PAIRS) for (const index of pair) game = activateCard(game, index);
  assert.ok(isWon(game));
  return { ...game, elapsedMs };
}

function playing(seat: number, match = 0): State {
  const start = initialState(EXAMPLE_CODE);
  return {
    ...start,
    tournament: createTournament(PLAYERS, CODES),
    phase: TurnPhase.playing,
    active: { match, seat },
  };
}

test('a tournament starts on the setup screen with four empty names', () => {
  const state = initialState(EXAMPLE_CODE);
  assert.equal(screenOf(state), 'setup');
  assert.equal(state.count, 4);
  assert.deepEqual(state.drafts, Array(8).fill(''));
  assert.equal(shownTurn(state), null);
});

test('tournament games keep their own preferences away from the saved size and bests', () => {
  const state = initialState(EXAMPLE_CODE);
  assert.deepEqual(state.session.preferences, { size: 4, bestMoves: {} });
  const game = createGame('np1-10-5');
  const replaced = replaceGame(state.session, game, false);
  assert.equal(replaced.preferences.size, 10);
  assert.deepEqual(state.session.preferences, { size: 4, bestMoves: {} });
});

test('the first game of a match is recorded in whole milliseconds without a verdict', () => {
  const state = playing(0);
  const won = { ...state.session, game: wonGame(1500.7), feedback: 'Pair found.' };
  const next = finishTurn(state, won);
  assert.deepEqual(next?.tournament?.matches[0]?.results, [{ moves: 8, elapsedMs: 1500 }]);
  assert.equal(next?.phase, TurnPhase.done);
  assert.equal(next?.session.feedback, 'Pair found.');
  assert.deepEqual(shownTurn({ ...state, ...next }), { match: 0, seat: 0 });
});

test('the second game names the match winner in the one announcement', () => {
  const first = finishTurn(playing(0), { ...playing(0).session, game: wonGame(100) });
  assert.ok(first);
  const second = { ...first, phase: TurnPhase.playing, active: { match: 0, seat: 1 } };
  const session = { ...second.session, game: wonGame(200), feedback: 'Pair found.' };
  const next = finishTurn(second, session);
  assert.equal(next?.session.feedback, 'Pair found. Ada wins the match.');
});

test('a game that is not won records nothing', () => {
  const state = playing(0);
  const session = activateSession(state.session, 0);
  assert.equal(finishTurn(state, session), null);
});

test('the last game of the final ends the tournament and names its champion', () => {
  let tournament = createTournament(PLAYERS, CODES);
  for (let turn = 0; turn < 5; turn += 1) {
    const state = { ...playing(turn % 2, Math.floor(turn / 2)), tournament };
    const next = finishTurn(state, { ...state.session, game: wonGame(100 + turn) });
    assert.ok(next?.tournament);
    tournament = next.tournament;
  }
  const state = { ...playing(1, 2), tournament };
  const next = finishTurn(state, { ...state.session, game: wonGame(900), feedback: 'Done.' });
  assert.equal(screenOf({ ...state, ...next }), 'finished');
  assert.equal(next?.session.feedback, 'Done. Ada wins the tournament.');
});

test('a loaded draft fills the setup and a loaded tournament continues from its results', () => {
  const base = initialState(EXAMPLE_CODE);
  const draft = loadedState(base, { players: ['Eve', 'Fay', 'Gus', 'Hui'], matches: [] });
  assert.equal(screenOf(draft ?? base), 'setup');
  assert.deepEqual(draft?.drafts.slice(0, 5), ['Eve', 'Fay', 'Gus', 'Hui', '']);
  const started = loadedState(base, createTournament(PLAYERS, CODES));
  assert.equal(screenOf(started ?? base), 'play');
  assert.deepEqual(started && shownTurn(started), { match: 0, seat: 0 });
  assert.equal(loadedState(base, { players: ['Eve'], matches: [] }), null);
});
