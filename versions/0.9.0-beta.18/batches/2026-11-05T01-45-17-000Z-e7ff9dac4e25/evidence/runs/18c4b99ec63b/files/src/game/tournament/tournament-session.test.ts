import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  finishTurn,
  idleSession,
  NextStep,
  nextStep,
  nextTurn,
  openSession,
  shownTurn,
  startTurn,
  TurnPhase,
} from './tournament-session.ts';
import { champion, isFinished, turnsPlayed } from './tournament.ts';
import { FOUR_PLAYERS, firstPlayersWin, newTournament, turn } from './tournament.fixture.ts';

test('a new tournament waits for its first player to start', () => {
  const session = openSession(newTournament(FOUR_PLAYERS), 'Hello.');
  assert.equal(session.phase, TurnPhase.ready);
  assert.equal(session.notice, 'Hello.');
  assert.equal(shownTurn(session)?.player, 'Ann');
  assert.equal(nextStep(session), NextStep.none);
  assert.equal(idleSession().tournament, null);
  assert.equal(shownTurn(idleSession()), null);
  assert.equal(nextStep(idleSession()), NextStep.none);
});

test('each game is started, finished and followed by a next turn or a next match', () => {
  let session = openSession(newTournament(FOUR_PLAYERS));
  const seen: string[] = [];
  for (let game = 0; game < 6; game += 1) {
    assert.equal(session.phase, TurnPhase.ready);
    seen.push(`${shownTurn(session)?.player} ${session.phase}`);
    session = startTurn(session);
    assert.equal(session.phase, TurnPhase.playing);
    seen.push(`${shownTurn(session)?.player} ${session.phase}`);
    session = finishTurn(session, turn(game % 2 === 0 ? 8 : 9));
    assert.equal(turnsPlayed(session.tournament ?? newTournament(FOUR_PLAYERS)), game + 1);
    seen.push(`${shownTurn(session)?.player} ${session.phase} ${nextStep(session)}`);
    if (game < 5) session = nextTurn(session);
  }
  assert.deepEqual(seen, [
    'Ann ready',
    'Ann playing',
    'Ann done turn',
    'Ben ready',
    'Ben playing',
    'Ben done match',
    'Cy ready',
    'Cy playing',
    'Cy done turn',
    'Dee ready',
    'Dee playing',
    'Dee done match',
    'Ann ready',
    'Ann playing',
    'Ann done turn',
    'Cy ready',
    'Cy playing',
    'Cy done none',
  ]);
  assert.equal(session.tournament ? champion(session.tournament) : null, 'Ann');
});

test('steps out of order change nothing', () => {
  const ready = openSession(newTournament(FOUR_PLAYERS));
  assert.equal(finishTurn(ready, turn(8)), ready);
  assert.equal(nextTurn(ready), ready);
  const playing = startTurn(ready);
  assert.equal(startTurn(playing), playing);
  assert.equal(nextTurn(playing), playing);
  const done = finishTurn(playing, turn(8));
  assert.equal(startTurn(done), done);
  assert.equal(finishTurn(done, turn(8)), done);
  const idle = idleSession();
  assert.equal(startTurn(idle), idle);
  assert.equal(finishTurn(idle, turn(8)), idle);
  assert.equal(nextTurn(idle), idle);
});

test('a finished tournament opens on its result and no step goes on from it', () => {
  const tournament = firstPlayersWin(newTournament(FOUR_PLAYERS));
  const session = openSession(tournament);
  assert.equal(isFinished(tournament), true);
  assert.equal(session.phase, TurnPhase.done);
  assert.equal(nextStep(session), NextStep.none);
  assert.equal(startTurn(session), session);
  assert.equal(nextTurn(session), session);
  assert.equal(shownTurn(session)?.player, 'Cy');
});

test('an unfinished tournament that was exported resumes with its next player', () => {
  const partial = openSession(newTournament(FOUR_PLAYERS));
  const afterOne = finishTurn(startTurn(partial), turn(8));
  const resumed = openSession(afterOne.tournament ?? newTournament(FOUR_PLAYERS));
  assert.equal(resumed.phase, TurnPhase.ready);
  assert.equal(shownTurn(resumed)?.player, 'Ben');
});
