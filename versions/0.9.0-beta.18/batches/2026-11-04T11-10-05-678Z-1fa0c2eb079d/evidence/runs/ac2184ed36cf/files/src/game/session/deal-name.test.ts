import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateSession, initialSession, setDealName } from './session.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../game.fixture.ts';

const PREFERENCES = { size: 4, bestMoves: {} };

test('name edits preserve progress and session state while allowing paused and completed games', () => {
  const playing = activateSession(activateSession(initialSession(EXAMPLE_CODE, PREFERENCES), 0), 1);
  const paused = { ...playing, paused: true };
  let completed = initialSession(EXAMPLE_CODE, PREFERENCES);
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) completed = activateSession(completed, index);

  for (const before of [playing, paused, completed]) {
    const after = setDealName(before, '  Café 🎴  ');
    assert.deepEqual({ ...after.game, name: before.game.name }, before.game);
    assert.equal(after.game.name, '  Café 🎴  ');
    assert.equal(after.paused, before.paused);
    assert.equal(after.generation, before.generation);
    assert.equal(after.feedback, before.feedback);
    assert.equal(after.loadNotice, before.loadNotice);
    assert.equal(after.announcement, before.announcement);
    assert.equal(after.celebration, before.celebration);
    assert.equal(after.preferences, before.preferences);
  }
});

test('clearing a name is valid and invalid edits leave the session unchanged', () => {
  const named = setDealName(initialSession(EXAMPLE_CODE, PREFERENCES), 'Café');
  assert.equal(setDealName(named, '').game.name, '');
  assert.equal(setDealName(named, 'invalid\nname'), named);
  assert.equal(setDealName(named, '😀'.repeat(21)), named);
});
