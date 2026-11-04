import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from '../game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../game.fixture.ts';
import { initialSession, renameSession, replaceGame, tickSession } from './session.ts';

test('renaming an active, paused or completed session preserves every other field', () => {
  const initial = initialSession(EXAMPLE_CODE, { size: 4, bestMoves: {} });
  const pending = activateCard(activateCard(initial.game, 0), 1);
  const completed = EXAMPLE_PAIRS.flat().reduce(activateCard, initial.game);
  for (const session of [
    { ...initial, game: pending },
    replaceGame(initial, pending, true),
    replaceGame(initial, completed, true),
  ]) {
    const named = renameSession(session, 'Café');
    assert.deepEqual(named, { ...session, game: { ...session.game, name: 'Café' } });
    assert.equal(named.preferences, session.preferences);
    assert.equal(named.game.selection, session.game.selection);
    assert.equal(renameSession(named, named.game.name), named);
    assert.equal(renameSession(named, 'invalid\nname'), named);
    assert.deepEqual(renameSession(named, ''), session);
  }
});

test('renaming keeps time and paused mismatches governed by the existing session clock', () => {
  const initial = initialSession(EXAMPLE_CODE, { size: 4, bestMoves: {} });
  const game = activateCard(activateCard(initial.game, 0), 1);
  const active = renameSession({ ...initial, game }, 'Café');
  const advanced = tickSession(active, active.generation, 300);
  assert.equal(advanced.game.name, 'Café');
  assert.equal(advanced.game.elapsedMs, 300);
  const paused = renameSession(replaceGame(initial, game, true), 'Café');
  assert.equal(tickSession(paused, paused.generation, 300), paused);
  assert.equal(replaceGame(paused, createGame(EXAMPLE_CODE), false).game.name, '');
});
