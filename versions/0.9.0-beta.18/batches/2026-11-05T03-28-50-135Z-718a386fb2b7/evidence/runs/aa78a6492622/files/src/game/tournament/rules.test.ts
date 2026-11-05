import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from '../game.ts';
import { boardCode } from '../deck.ts';
import {
  beginTurn,
  champion,
  createTournament,
  currentMatch,
  currentPlayer,
  finishTurn,
  nextMatch,
  nextTurn,
  winningSeed,
} from './rules.ts';
import type { GameState } from '../game.ts';
import type { Entrant, Tournament } from './rules.ts';

const PLAYERS: Entrant[] = ['Ada', 'Bo', 'Cora', 'Dev'].map((name, index) => ({
  seed: index + 1,
  name,
}));
const CODES = [boardCode(6, 1), boardCode(6, 2), boardCode(8, 3)];

function solvedGame(code: string, elapsedMs = 0, extraMoves = 0): GameState {
  let game = createGame(code);
  const first = new Map<number, number>();
  const pairs = game.deck.length / 2;
  game.deck.forEach((face, index) => {
    const previous = first.get(face);
    if (previous === undefined) first.set(face, index);
    else {
      game = activateCard(game, previous);
      if (elapsedMs) game = advanceGame(game, elapsedMs / pairs);
      game = activateCard(game, index);
    }
  });
  return { ...game, moves: game.moves + extraMoves };
}

function completeCurrent(tournament: Tournament, elapsedMs = 0, extraMoves = 0): Tournament {
  const playing = beginTurn(tournament);
  const game = solvedGame(currentMatch(playing).boardCode, elapsedMs, extraMoves);
  return finishTurn(playing, game, '2026-11-05T12:00:00.000Z');
}

test('both players receive a fresh game on the same match deal', () => {
  const opening = createTournament(PLAYERS, CODES, '2026-11-05T11:00:00.000Z');
  assert.equal(currentPlayer(opening)?.name, 'Ada');
  const first = beginTurn(opening);
  assert.equal(first.currentGame?.boardCode, opening.matches[0]?.boardCode);
  const afterFirst = completeCurrent(opening);
  assert.equal(afterFirst.phase, 'turnComplete');
  const second = beginTurn(nextTurn(afterFirst));
  assert.equal(currentPlayer(second)?.name, 'Dev');
  assert.equal(second.currentGame?.boardCode, first.currentGame?.boardCode);
  assert.equal(second.currentGame?.moves, 0);
  assert.equal(second.currentGame?.matched.length, 0);
});

test('winners advance through a four-player bracket to the champion', () => {
  let event = createTournament(PLAYERS, CODES, '2026-11-05T11:00:00.000Z');
  event = completeCurrent(event);
  event = completeCurrent(nextTurn(event));
  assert.equal(event.matches[0]?.winnerSeed, 1, 'equal results favor the higher seed');
  assert.deepEqual(event.matches[2]?.playerSeeds, [1, null]);
  event = completeCurrent(nextMatch(event), 100, 0);
  event = completeCurrent(nextTurn(event), 0, 1);
  assert.equal(event.matches[1]?.winnerSeed, 2, 'fewer moves beats a faster time');
  event = completeCurrent(nextMatch(event));
  assert.equal(currentPlayer(event)?.name, 'Ada');
  event = completeCurrent(event);
  event = completeCurrent(nextTurn(event), 0, 1);
  assert.equal(event.phase, 'finished');
  assert.equal(champion(event)?.name, 'Ada');
  assert.equal(event.finishedAt, '2026-11-05T12:00:00.000Z');
});

test('result comparison is moves, active time, then entry seed', () => {
  assert.equal(winningSeed(1, { moves: 8, elapsedMs: 200 }, 4, { moves: 9, elapsedMs: 0 }), 1);
  assert.equal(winningSeed(4, { moves: 8, elapsedMs: 201 }, 3, { moves: 8, elapsedMs: 200 }), 3);
  assert.equal(winningSeed(4, { moves: 8, elapsedMs: 200 }, 3, { moves: 8, elapsedMs: 200 }), 3);
});
