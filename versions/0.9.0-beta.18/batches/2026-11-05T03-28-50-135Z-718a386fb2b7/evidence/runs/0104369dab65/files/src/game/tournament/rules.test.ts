import { test } from 'vitest';
import { activateCard, createGame } from '../game.ts';
import { decodeProgress, encodeProgress } from './progress.ts';
import assert from 'node:assert/strict';
import { nameError, newMatch, normalizeName, opening, pairAt, roundSize, winner } from './rules.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import type { Match, TournamentState } from './rules.ts';

test('normalizes names and checks code points and duplicate names', () => {
  assert.equal(normalizeName('  Jose\u0301   Smith  '), 'José Smith');
  assert.equal(nameError(['A😀', 'Bo', 'Cy', 'De']), '');
  assert.equal(nameError(['A', 'Bo', 'Cy', 'De']), 'Use 2 to 20 characters.');
  assert.equal(nameError(['Ada', 'Bo', 'ADA', 'De']), 'Each name must be different.');
});
test('seeds brackets and uses moves, active time, then seed to advance', () => {
  assert.deepEqual(opening(4), [
    [0, 3],
    [1, 2],
  ]);
  assert.deepEqual(opening(8), [
    [0, 7],
    [3, 4],
    [2, 5],
    [1, 6],
  ]);
  assert.deepEqual(
    Array.from({ length: 7 }, (_, i) => roundSize(8, i)),
    [4, 4, 4, 4, 6, 6, 8],
  );
  const match: Match = {
    players: [3, 4],
    code: 'np1-4-1',
    results: [
      { moves: 8, elapsedMs: 99 },
      { moves: 9, elapsedMs: 1 },
    ],
    winner: null,
  };
  assert.equal(winner(match), 3);
  match.results = [
    { moves: 8, elapsedMs: 99.4 },
    { moves: 8, elapsedMs: 99.3 },
  ];
  assert.equal(winner(match), 4);
  match.results = [
    { moves: 8, elapsedMs: 99 },
    { moves: 8, elapsedMs: 99 },
  ];
  assert.equal(winner(match), 3);
});
test('round trips and validates match identities and unknown fields', () => {
  const names = ['Ada', 'Bo', 'Cy', 'De'];
  const m = newMatch(names, [], 'np1-6-1');
  m.results = [
    { moves: 18, elapsedMs: 100 },
    { moves: 19, elapsedMs: 80 },
  ];
  m.winner = 0;
  const n = newMatch(names, [m], 'np1-6-2');
  n.results = [
    { moves: 20, elapsedMs: 100 },
    { moves: 19, elapsedMs: 200 },
  ];
  n.winner = 2;
  assert.deepEqual(pairAt(names, [m, n]), [0, 2]);
  const t: TournamentState = { names, matches: [m, n], phase: 'matchDone', snapshot: null };
  const text = encodeTournament(t, Array(8).fill(''), 4);
  const parsed = decodeTournament(text);
  assert.notEqual(typeof parsed, 'string');
  if (typeof parsed !== 'string') assert.deepEqual(parsed.tournament, t);
  const object = JSON.parse(text);
  object.tournament.matches[0].players = [1, 3];
  assert.equal(decodeTournament(JSON.stringify(object)), 'Invalid tournament.');
  object.tournament.matches[0].extra = 1;
  assert.equal(decodeTournament(JSON.stringify(object)), 'Unknown field: extra.');
});

test('exported active progress preserves fractional active time', () => {
  const game = { ...activateCard(createGame('np1-6-1'), 0), elapsedMs: 123.75 };
  const restored = decodeProgress(encodeProgress(game));
  assert.equal(restored?.elapsedMs, 123.75);
  assert.equal(restored?.boardCode, game.boardCode);
});
