import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isWon } from '../game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../game.fixture.ts';
import { activateSession, initialSession } from '../session/session.ts';
import { beginTurn, clearTurn, idleTurn, noticeTurn, resetTurn } from './turn-session.ts';
import type { Session } from '../session/session.ts';

function finish(session: Session, recordBest: boolean): Session {
  let state = session;
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) state = activateSession(state, index, recordBest);
  return state;
}

test('finishing a tournament game leaves the saved size and bests as they were', () => {
  const preferences = { size: 10, bestMoves: { '4': 12 } };
  const start = beginTurn({ ...idleTurn(), preferences }, EXAMPLE_CODE);
  const done = finish(start, false);
  assert.equal(isWon(done.game), true);
  assert.equal(done.game.moves, 8);
  assert.equal(done.preferences, preferences);
  assert.equal(done.celebration, true);
});

test('finishing an ordinary game still records its best', () => {
  const done = finish(initialSession(EXAMPLE_CODE, { size: 4, bestMoves: { '4': 12 } }), true);
  assert.deepEqual(done.preferences.bestMoves, { '4': 8 });
});

test('each turn is a fresh hidden game on the match deal with a later generation', () => {
  const first = finish(beginTurn(idleTurn(), EXAMPLE_CODE), false);
  const second = beginTurn(first, EXAMPLE_CODE);
  assert.equal(second.game.boardCode, EXAMPLE_CODE);
  assert.deepEqual(second.game.deck, first.game.deck);
  assert.equal(second.game.moves, 0);
  assert.equal(second.game.started, false);
  assert.equal(second.generation, first.generation + 1);
  assert.equal(second.feedback, '');
  assert.equal(second.celebration, false);
});

test('clearing a turn is silent and a notice is a new event', () => {
  const done = finish(beginTurn(idleTurn(), EXAMPLE_CODE), false);
  const cleared = clearTurn(done);
  assert.equal(cleared.feedback, '');
  assert.equal(cleared.announcement, done.announcement);
  const noticed = noticeTurn(cleared, 'Each name must be different.');
  assert.equal(noticed.feedback, 'Each name must be different.');
  assert.equal(noticed.announcement, cleared.announcement + 1);
  const reset = resetTurn(noticed);
  assert.equal(reset.generation, noticed.generation + 1);
  assert.equal(reset.announcement, noticed.announcement);
  assert.equal(reset.game.started, false);
});
