import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateSession, initialSession } from '../session/session.ts';
import {
  currentMatchIndex,
  currentPlayerName,
  matchPlayers,
  matchWinner,
  tournamentRound,
} from './pairing.ts';
import { normalizePlayerName, playerNamesError } from './names.ts';
import { TournamentPhase } from './model.ts';
import {
  finishTournamentTurn,
  nextTournamentTurn,
  startTournament,
  tournamentSetup,
} from './rules.ts';
import {
  exampleTournament,
  finishExampleTurn,
  finishedExampleTournament,
} from './tournament.fixture.ts';

test('entry seeds follow the specified four and eight player opening orders', () => {
  const four = exampleTournament();
  assert.deepEqual(
    [0, 1].map((index) => matchPlayers(four, index)),
    [
      [1, 4],
      [2, 3],
    ],
  );
  const eight = exampleTournament(8);
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
    eight.matches.map((_, index) => tournamentRound(8, index).size),
    [4, 4, 4, 4, 6, 6, 8],
  );
  assert.deepEqual(
    four.matches.map((_, index) => tournamentRound(4, index).name),
    ['Semifinal', 'Semifinal', 'Final'],
  );
});

test('accepted names normalize whitespace and Unicode, count code points and reject group repeats', () => {
  assert.equal(normalizePlayerName('  Cafe\u0301   Noir  '), 'Café Noir');
  assert.equal(playerNamesError(['A😀', 'Bo', 'Cora', 'Dev']), null);
  assert.equal(playerNamesError(['😀'.repeat(20), 'Bo', 'Cora', 'Dev']), null);
  for (const name of ['', 'A', '😀'.repeat(21)])
    assert.equal(playerNamesError([name, 'Bo', 'Cora', 'Dev']), 'Use 2 to 20 characters.');
  assert.equal(playerNamesError(['Ada', 'Bo', 'Cora', ' ADA ']), 'Each name must be different.');
  assert.equal(
    playerNamesError(['Café', 'Bo', 'Cora', 'Cafe\u0301']),
    'Each name must be different.',
  );
});

test('match results compare moves, fractional active time, then the lower seed number', () => {
  for (const [firstMoves, firstTime, secondMoves, secondTime, winner] of [
    [0, 100, 1, 0, 1],
    [1, 0, 0, 100, 4],
    [0, 10.1, 0, 10.2, 1],
    [0, 10.2, 0, 10.1, 4],
    [0, 10, 0, 10, 1],
  ]) {
    const first = finishExampleTurn(exampleTournament(), firstMoves, firstTime);
    const second = finishExampleTurn(nextTournamentTurn(first), secondMoves, secondTime);
    assert.equal(matchWinner(second, 0), winner);
    assert.equal(second.phase, TournamentPhase.matchEnd);
  }
});

test('handoffs repeat the match deal with a fresh board and require another Start turn', () => {
  const initial = exampleTournament();
  assert.equal(currentPlayerName(initial), 'Ada');
  const first = finishExampleTurn(initial);
  assert.equal(first.phase, TournamentPhase.turnEnd);
  assert.equal(currentPlayerName(first), 'Ada');
  const next = nextTournamentTurn(first);
  assert.equal(next.phase, TournamentPhase.ready);
  assert.equal(next.game?.boardCode, initial.game?.boardCode);
  assert.deepEqual(next.game?.matched, []);
  assert.equal(next.game?.moves, 0);
  assert.equal(currentPlayerName(next), 'Dev');
  assert.equal(nextTournamentTurn(next), next);
  assert.equal(finishTournamentTurn(initial, initial.game!), initial);
});

test('both bracket sizes advance adjacent winners to a single champion', () => {
  for (const count of [4, 8]) {
    const state = finishedExampleTournament(count);
    assert.equal(state.phase, TournamentPhase.complete);
    assert.equal(currentMatchIndex(state), count - 2);
    assert.equal(matchWinner(state, count - 2), 1);
    assert.ok(state.matches.every((match) => match.results.length === 2));
    assert.equal(new Set(state.matches.map((match) => match.boardCode)).size, count - 1);
  }
});

test('invalid start data cannot create an event', () => {
  const state = exampleTournament();
  assert.equal(
    startTournament(
      state.names,
      state.matches.map(() => 'np1-6-1'),
    ),
    null,
  );
  assert.equal(startTournament(state.names, ['np1-4-1', 'np1-6-2', 'np1-8-3']), null);
  assert.equal(startTournament(['Ada'], []), null);
  assert.equal(tournamentSetup().phase, TournamentPhase.setup);
});

test('tournament activation leaves ordinary preferences unchanged through a win', () => {
  const completed = finishedExampleTournament();
  const game = completed.game;
  assert.ok(game);
  let session = initialSession(game.boardCode, { size: 10, bestMoves: { '8': 40 } });
  const preferences = session.preferences;
  for (const face of new Set(game.deck))
    for (const [index, value] of game.deck.entries())
      if (value === face) session = activateSession(session, index, false);
  assert.equal(session.preferences, preferences);
});
