import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame } from '../game.ts';
import { initialSession, activateSession } from '../session/session.ts';
import { normalizeName, nameError } from './names.ts';
import {
  matchPlayers,
  matchWinner,
  nextTournamentTurn,
  roundFor,
  startTournamentTurn,
  updateTournamentGame,
} from './rules.ts';
import { TournamentPhase } from './model.ts';
import { tournamentFixture, finishTournamentTurn } from './tournament.fixture.ts';

test('names normalize spacing and canonical Unicode before length and group comparison', () => {
  assert.equal(normalizeName('  Cafe\u0301\t  Noir  '), 'Café Noir');
  assert.equal(nameError(['Al', 'Bo', '😀'.repeat(20), 'Dee']), '');
  for (const name of ['', 'A', '😀'.repeat(21)])
    assert.equal(nameError([name, 'Bo', 'Cora', 'Dee']), 'Use 2 to 20 characters.');
  assert.equal(nameError(['Café', 'Bo', '  CAFE\u0301 ', 'Dee']), 'Each name must be different.');
});

test('opening brackets use the specified entry-order opponents and stage sizes', () => {
  const four = tournamentFixture();
  assert.deepEqual(
    [0, 1].map((index) => matchPlayers(four, index)),
    [
      [1, 4],
      [2, 3],
    ],
  );
  const eight = tournamentFixture(8);
  assert.deepEqual(
    [0, 1, 2, 3].map((index) => matchPlayers(eight, index)),
    [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ],
  );
  assert.deepEqual(
    eight.matches.map((_, index) => roundFor(8, index)),
    [
      { name: 'Quarterfinal', size: 4 },
      { name: 'Quarterfinal', size: 4 },
      { name: 'Quarterfinal', size: 4 },
      { name: 'Quarterfinal', size: 4 },
      { name: 'Semifinal', size: 6 },
      { name: 'Semifinal', size: 6 },
      { name: 'Final', size: 8 },
    ],
  );
});

test('a handoff resets progress and time on the same deal and only a finish records a result', () => {
  const ready = tournamentFixture();
  const playing = startTournamentTurn(ready);
  const revealed = updateTournamentGame(playing, advanceGame(activateCard(playing.game, 0), 250.5));
  assert.equal(revealed.matches[0]?.results[0], null);
  const finished = finishTournamentTurn(revealed, 0, 250.5);
  assert.equal(finished.phase, TournamentPhase.turnFinished);
  const second = nextTournamentTurn(finished);
  assert.equal(second.turn, 1);
  assert.equal(second.game.boardCode, ready.game.boardCode);
  assert.deepEqual(second.game.deck, ready.game.deck);
  assert.equal(second.game.moves, 0);
  assert.equal(second.game.elapsedMs, 0);
  assert.equal(second.game.started, false);
  assert.deepEqual(second.game.matched, []);
  assert.equal(second.phase, TournamentPhase.ready);
});

test('results compare moves before exact active time and then the higher entry seed', () => {
  for (const [firstMoves, firstTime, secondMoves, secondTime, winner] of [
    [0, 90_000, 1, 1000, 1],
    [1, 1000, 0, 90_000, 4],
    [0, 1000.9, 0, 1000.1, 4],
    [0, 1000, 0, 1000, 1],
  ]) {
    const first = finishTournamentTurn(tournamentFixture(), firstMoves, firstTime);
    const match = finishTournamentTurn(nextTournamentTurn(first), secondMoves, secondTime);
    assert.equal(matchWinner(match, 0), winner);
  }
});

test('both bracket sizes advance adjacent winners through every match to a champion', () => {
  for (const count of [4, 8]) {
    let state = tournamentFixture(count);
    let attempts = 0;
    while (state.phase !== TournamentPhase.complete) {
      state = finishTournamentTurn(state);
      attempts += 1;
      if (state.phase !== TournamentPhase.complete) state = nextTournamentTurn(state);
    }
    assert.equal(attempts, (count - 1) * 2);
    assert.equal(matchWinner(state, count - 2), 1);
    assert.deepEqual(matchPlayers(state, count - 2), [1, 2]);
    assert.equal(nextTournamentTurn(state), state);
    assert.equal(startTournamentTurn(state), state);
  }
});

test('competition completion leaves ordinary preferences and bests unchanged', () => {
  const preferences = { size: 10, bestMoves: { '4': 12 } };
  let session = initialSession('np1-4-1', preferences);
  for (let face = 0; face < 8; face += 1)
    for (const [index, value] of session.game.deck.entries())
      if (value === face) session = activateSession(session, index, false);
  assert.equal(session.preferences, preferences);
  assert.equal(session.preferences.size, 10);
  assert.equal(session.preferences.bestMoves['4'], 12);
});
