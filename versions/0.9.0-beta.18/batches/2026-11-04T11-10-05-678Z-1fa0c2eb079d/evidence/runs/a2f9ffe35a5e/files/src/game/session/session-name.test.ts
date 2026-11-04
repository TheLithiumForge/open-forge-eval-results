import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../game.fixture.ts';
import {
  activateSession,
  initialSession,
  renameSession,
  replaceGame,
  tickSession,
} from './session.ts';
import type { Session } from './session.ts';

const PREFERENCES = { size: 4, bestMoves: { '4': 10 } };

function assertOnlyNameChanged(before: Session, after: Session, name: string): void {
  assert.deepEqual(after, { ...before, game: { ...before.game, name } });
  assert.equal(after.game.deck, before.game.deck);
  assert.equal(after.game.matched, before.game.matched);
  assert.equal(after.game.selection, before.game.selection);
  assert.equal(after.preferences, before.preferences);
}

test('renaming an active session preserves its turn, timing, feedback and saved preferences', () => {
  const initial = initialSession(EXAMPLE_CODE, PREFERENCES);
  const mismatch = activateSession(activateSession(initial, 0), 1);
  const running = tickSession(mismatch, mismatch.generation, 175);
  const named = renameSession(running, '  Café 🎴  ');
  assertOnlyNameChanged(running, named, '  Café 🎴  ');
  assert.equal(named.game.elapsedMs, 175);
  assert.deepEqual(named.game.selection, {
    kind: 'mismatch',
    first: 0,
    second: 1,
    remainingMs: 625,
  });
  assert.equal(tickSession(named, named.generation, 625).game.name, '  Café 🎴  ');
  assertOnlyNameChanged(named, renameSession(named, ''), '');
  for (const invalid of ['x'.repeat(41), 'line\nbreak', 'line\rbreak'])
    assert.equal(renameSession(named, invalid), named);
  assert.equal(renameSession(named, named.game.name), named);
});

test('a paused import can be renamed without resuming play or changing its load notice', () => {
  const initial = initialSession(EXAMPLE_CODE, PREFERENCES);
  const pending = activateSession(activateSession(initial, 0), 1);
  const paused = replaceGame(initial, pending.game, true);
  const named = renameSession(paused, 'Paused');
  assertOnlyNameChanged(paused, named, 'Paused');
  assert.equal(named.paused, true);
  assert.equal(activateSession(named, 2), named);
  assert.equal(tickSession(named, named.generation, 800), named);
});

test('renaming completed play and completed imports keeps bests and celebration unchanged', () => {
  let won = initialSession(EXAMPLE_CODE, PREFERENCES);
  for (const pair of EXAMPLE_PAIRS) for (const index of pair) won = activateSession(won, index);
  const namedWin = renameSession(won, 'Winner');
  assertOnlyNameChanged(won, namedWin, 'Winner');
  assert.equal(namedWin.celebration, true);
  const imported = replaceGame(initialSession(EXAMPLE_CODE, PREFERENCES), namedWin.game, true);
  const renamedImport = renameSession(imported, 'Completed import');
  assertOnlyNameChanged(imported, renamedImport, 'Completed import');
  assert.equal(renamedImport.paused, false);
  assert.equal(renamedImport.celebration, false);
  assert.equal(renamedImport.preferences.bestMoves['4'], 10);
});

test('named imports restore names and fresh deals or unnamed imports clear them', () => {
  const initial = initialSession(EXAMPLE_CODE, PREFERENCES);
  assert.equal(initial.game.name, '');
  const named = renameSession(initial, 'Saved');
  const restored = decodeSnapshot(encodeSnapshot(named.game));
  assert.ok(restored);
  assert.equal(replaceGame(initial, restored, true).game.name, 'Saved');
  const unnamed = decodeSnapshot(encodeSnapshot(createGame(EXAMPLE_CODE)));
  assert.ok(unnamed);
  assert.equal(replaceGame(named, unnamed, true).game.name, '');
  for (const code of [EXAMPLE_CODE, 'np1-4-2', 'np1-6-1'])
    assert.equal(replaceGame(named, createGame(code), false).game.name, '');
  assert.deepEqual(named.preferences, PREFERENCES);
});
