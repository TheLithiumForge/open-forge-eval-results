import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { activateCard, createGame } from '../game.ts';
import { activateSession } from '../session/session.ts';
import { createTournament, dealSizes, recordResult } from './rules.ts';
import { IDLE, resultOf, turnSession, viewOf } from './turn.ts';
import type { Tournament } from './rules.ts';

const CODES = dealSizes(4).map((size, index) => boardCode(size, index + 1));
const fresh = (): Tournament => createTournament(['Ada', 'Bo', 'Cora', 'Dev'], CODES);

test('the idle session never starts, so no clock runs behind a screen without a board', () => {
  assert.equal(IDLE.game.started, false);
  assert.equal(IDLE.paused, false);
});

test('each turn is a new deal on its own generation with preferences of its own', () => {
  const first = turnSession('np1-6-1', 1);
  const second = turnSession('np1-6-1', 2);
  assert.equal(first.game.boardCode, 'np1-6-1');
  assert.notEqual(first.generation, second.generation);
  assert.deepEqual(first.preferences, { size: 4, bestMoves: {} });
});

test('a finished turn is kept as moves and whole milliseconds', () => {
  const game = { ...createGame('np1-4-1'), moves: 21, elapsedMs: 4321.9 };
  assert.deepEqual(resultOf(game), { moves: 21, elapsedMs: 4321 });
});

test('finishing a turn leaves the preferences it started with untouched', () => {
  let session = turnSession('np1-4-1', 1);
  const before = session.preferences;
  const deck = session.game.deck;
  for (const face of new Set(deck))
    for (const index of deck.flatMap((value, at) => (value === face ? [at] : [])))
      session = activateSession(session, index);
  assert.equal(session.game.matched.length, deck.length);
  assert.equal(session.preferences.size, before.size);
  assert.equal(activateCard(session.game, 0), session.game);
});

test('the screen follows the tournament, the turn on screen and its game', () => {
  const tournament = fresh();
  const game = createGame(CODES[0] ?? '');
  const won = { ...game, matched: game.deck.map((_, index) => index) };
  assert.deepEqual(viewOf(null, null, game), { kind: 'setup' });
  assert.deepEqual(viewOf(tournament, null, game), { kind: 'ready', turn: { match: 0, slot: 0 } });
  const first = { match: 0, slot: 0 } as const;
  const second = { match: 0, slot: 1 } as const;
  assert.deepEqual(viewOf(tournament, first, game), { kind: 'playing', turn: first });
  assert.deepEqual(viewOf(tournament, first, won), { kind: 'turnDone', turn: first });
  assert.deepEqual(viewOf(tournament, second, won), { kind: 'matchDone', turn: second });
  let done = tournament;
  for (const [match, slot] of [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 0],
    [2, 1],
  ] as const)
    done = recordResult(done, { match, slot }, { moves: 40 + slot, elapsedMs: 5000 });
  assert.deepEqual(viewOf(done, second, won), { kind: 'finished', champion: 0 });
});
