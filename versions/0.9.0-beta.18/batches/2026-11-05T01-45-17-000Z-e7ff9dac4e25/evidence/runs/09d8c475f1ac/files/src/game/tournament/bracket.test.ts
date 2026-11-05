import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { bracketRows, BRACKET_PENDING, BRACKET_UNDECIDED, matchLine, roundOf } from './bracket.ts';
import { createTournament, dealSizes, recordResult } from './rules.ts';

const CODES = dealSizes(4).map((size, index) => boardCode(size, index + 1));

test('a bracket lists each match with its players, results and winner', () => {
  let tournament = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], CODES);
  tournament = recordResult(tournament, { match: 0, slot: 0 }, { moves: 20, elapsedMs: 65_999 });
  tournament = recordResult(tournament, { match: 0, slot: 1 }, { moves: 21, elapsedMs: 1000 });
  const rows = bracketRows(tournament);
  assert.deepEqual(
    rows.map((row) => [row.match, row.player, row.moves, row.time, row.winner]),
    [
      ['Semifinal 1', 'Ada', '20', '1:05', true],
      ['Semifinal 1', 'Dev', '21', '0:01', false],
      ['Semifinal 2', 'Bo', BRACKET_PENDING, BRACKET_PENDING, false],
      ['Semifinal 2', 'Cora', BRACKET_PENDING, BRACKET_PENDING, false],
      ['Final', 'Ada', BRACKET_PENDING, BRACKET_PENDING, false],
      ['Final', BRACKET_UNDECIDED, BRACKET_PENDING, BRACKET_PENDING, false],
    ],
  );
  assert.equal(new Set(rows.map((row) => row.key)).size, rows.length);
});

test('a match line and a round name say where the tournament is', () => {
  const tournament = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], CODES);
  assert.equal(matchLine(tournament, 0), 'Match 1 of 2: Ada vs Dev');
  assert.equal(matchLine(tournament, 1), 'Match 2 of 2: Bo vs Cora');
  assert.equal(
    matchLine(tournament, 2),
    `Match 1 of 1: ${BRACKET_UNDECIDED} vs ${BRACKET_UNDECIDED}`,
  );
  assert.deepEqual(
    [0, 1, 2].map((index) => roundOf(tournament, index)),
    ['Semifinal', 'Semifinal', 'Final'],
  );
});
