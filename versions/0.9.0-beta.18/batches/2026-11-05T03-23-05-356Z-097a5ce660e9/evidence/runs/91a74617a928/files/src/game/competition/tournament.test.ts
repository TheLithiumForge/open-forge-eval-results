import assert from 'node:assert/strict';
import { test } from 'vitest';
import { exportTournament, importTournament } from './tournament-format.ts';
import { createGame } from '../game.ts';
import {
  createTournament,
  currentMatch,
  nameError,
  nextMatch,
  normalizeName,
  recordResult,
} from './tournament.ts';

const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
function result(code: string, moves: number, elapsedMs: number) {
  return { ...createGame(code), moves, elapsedMs };
}

test('seeds the two brackets in the prescribed order and normalizes names', () => {
  assert.deepEqual(
    createTournament(names.slice(0, 4)).rounds[0]!.map((m) => m.players),
    [
      [0, 3],
      [1, 2],
    ],
  );
  assert.deepEqual(
    createTournament(names).rounds[0]!.map((m) => m.players),
    [
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ],
  );
  assert.equal(normalizeName('  A\u0301  Name\tHere '), 'Á Name Here');
  assert.equal(nameError(['Ada', 'ada']), 'Each name must be different.');
  assert.equal(nameError(['😀']), 'Use 2 to 20 characters.');
});

test('advances winners using moves, active time and seed, and round trips every handoff', () => {
  let t = createTournament(names.slice(0, 4));
  const codes = new Set(t.rounds.flat().map((m) => m.code));
  assert.equal(codes.size, 2);
  let code = currentMatch(t).code;
  t = recordResult(t, result(code, 19, 600));
  assert.ok(importTournament(exportTournament(t)).tournament);
  t = { ...t, phase: 'ready' };
  assert.ok(importTournament(exportTournament(t)).tournament);
  t = recordResult(t, result(code, 19, 500));
  assert.equal(currentMatch(t).winner, 3);
  t = nextMatch(t);
  code = currentMatch(t).code;
  t = recordResult(t, result(code, 18, 500));
  t = recordResult(t, result(code, 19, 10));
  assert.equal(currentMatch(t).winner, 1);
  t = nextMatch(t);
  assert.deepEqual(currentMatch(t).players, [3, 1]);
  code = currentMatch(t).code;
  assert.equal(codes.has(code), false);
  t = recordResult(t, result(code, 32, 500));
  t = recordResult(t, result(code, 32, 500));
  assert.equal(t.phase, 'champion');
  assert.equal(currentMatch(t).winner, 1);
  assert.deepEqual(importTournament(exportTournament(t)).tournament, t);
});

test('rejects tampered imports without accepting extra fields or inconsistent winners', () => {
  const t = createTournament(names.slice(0, 4));
  const data = JSON.parse(exportTournament(t));
  data.tournament.rounds[0][0].extra = true;
  assert.equal(importTournament(JSON.stringify(data)).error, 'Unknown field: extra.');
  delete data.tournament.rounds[0][0].extra;
  data.tournament.rounds[0][0].winner = 0;
  assert.equal(importTournament(JSON.stringify(data)).tournament, null);
});
