import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateSession, initialSession, renameSession, replaceGame } from './session.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../game.fixture.ts';

const PREFERENCES = { size: 4, bestMoves: { '4': 11 } };

function finished() {
  let session = initialSession(EXAMPLE_CODE, PREFERENCES);
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) session = activateSession(session, index);
  return session;
}

test('renaming preserves progress, clock lifecycle, notices and preferences', () => {
  const initial = initialSession(EXAMPLE_CODE, PREFERENCES);
  const active = activateSession(initial, 2);
  const mismatch = activateSession(activateSession(initial, 0), 1);
  const paused = replaceGame(initial, mismatch.game, true);
  const complete = finished();
  const completedImport = replaceGame(initial, complete.game, true);

  for (const session of [initial, active, mismatch, paused, complete, completedImport]) {
    const renamed = renameSession(session, ' Café ');
    assert.notEqual(renamed, session);
    assert.equal(renamed.game.name, ' Café ');
    assert.deepEqual(renamed, { ...session, game: { ...session.game, name: ' Café ' } });
  }
  assert.equal(mismatch.game.selection.kind, 'mismatch');
  assert.equal(paused.paused, true);
  assert.equal(complete.celebration, true);
  assert.equal(completedImport.celebration, false);
});

test('empty names clear the name and invalid edits keep the exact session', () => {
  const initial = initialSession(EXAMPLE_CODE, PREFERENCES);
  const named = renameSession(initial, 'My deal');
  assert.deepEqual(renameSession(named, ''), initial);
  assert.equal(renameSession(initial, ''), initial);
  for (const name of ['x'.repeat(41), 'line\nbreak', 'line\rbreak', null, 1])
    assert.equal(renameSession(named, name), named);
  assert.equal(renameSession(named, 'My deal'), named);
});
