import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createTournament, nextMatch, nextTurn, normalizeNames, recordResult } from './rules.ts';
import { exportTournament, readTournament } from './format.ts';

const names = ['Ada', 'Bo', 'Cora', 'Dev'];
const codes = [['np1-6-1', 'np1-6-2'], ['np1-8-3']];
const result = (moves: number, elapsedMs: number) => ({ moves, elapsedMs });

test('names are normalized, counted by code point and unique without case', () => {
  assert.deepEqual(normalizeNames(['  Ada  Lovelace ', ' A😀 ', 'e\u0301m', 'Dev']), [
    'Ada Lovelace',
    'A😀',
    'ém',
    'Dev',
  ]);
  assert.equal(normalizeNames(['A', 'Bo']), 'Use 2 to 20 characters.');
  assert.equal(normalizeNames(['Ada', 'Bo', 'ADA', 'Dev']), 'Each name must be different.');
});

test('opening brackets, tie breaks, progression and exchange', () => {
  const eight = createTournament(
    [...names, 'Emi', 'Finn', 'Gia', 'Hal'],
    [['np1-4-1', 'np1-4-2', 'np1-4-3', 'np1-4-4'], codes[0]!, codes[1]!],
  );
  assert.deepEqual(
    eight.matches[0]!.map((m) => m.players),
    [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ],
  );
  let t = createTournament(names, codes);
  assert.deepEqual(
    t.matches[0]!.map((m) => m.players),
    [
      [1, 4],
      [2, 3],
    ],
  );
  t = recordResult(t, result(20, 100));
  assert.deepEqual(readTournament(exportTournament(t)).value, t);
  t = recordResult(nextTurn(t), result(20, 90));
  assert.equal(t.matches[0]![0]!.winner, 4);
  t = nextMatch(t);
  t = recordResult(t, result(20, 90));
  t = recordResult(nextTurn(t), result(20, 90));
  assert.equal(t.matches[0]![1]!.winner, 2);
  t = nextMatch(t);
  assert.deepEqual(t.matches[1]![0]!.players, [4, 2]);
  t = recordResult(t, result(32, 100));
  t = recordResult(nextTurn(t), result(33, 10));
  assert.equal(t.phase, 'complete');
  assert.equal(t.matches[1]![0]!.winner, 4);
  assert.deepEqual(readTournament(exportTournament(t)).value, t);
  const tampered = JSON.parse(exportTournament(t));
  tampered.tournament.matches[1][0].winner = 2;
  assert.equal(readTournament(JSON.stringify(tampered)).error, 'Invalid tournament.');
  tampered.extra = true;
  assert.equal(readTournament(JSON.stringify(tampered)).error, 'Unknown field: extra.');
});
