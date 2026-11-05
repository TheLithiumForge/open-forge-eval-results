import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import {
  advanceTournamentMatch,
  beginTournamentTurn,
  createTournament,
  roundPlan,
  stageSize,
} from './rules.ts';
import { compareTournamentResults, finishTournamentTurn } from './results.ts';
import { hasUniquePlayerNames, hasValidPlayerNames, normalizePlayerName } from './names.ts';
import type { TournamentPlayer } from './types.ts';

const CREATED = '2026-11-05T12:00:00.000Z';

function players(count: number): TournamentPlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Player ${index + 1}`,
    seed: index + 1,
  }));
}

function create(count: number) {
  const plan = roundPlan(count);
  const codes = plan.map((round, index) => boardCode(stageSize(round), index + 1));
  const tournament = createTournament(players(count), codes, CREATED);
  assert.ok(tournament);
  return tournament;
}

test('four and eight players receive the documented opening pairings and stage sizes', () => {
  const four = create(4);
  assert.deepEqual(
    four.matches.slice(0, 2).map((match) => match.players),
    [
      [1, 4],
      [2, 3],
    ],
  );
  assert.deepEqual(
    four.matches.map((match) => stageSize(match.round)),
    [6, 6, 8],
  );

  const eight = create(8);
  assert.deepEqual(
    eight.matches.slice(0, 4).map((match) => match.players),
    [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ],
  );
  assert.deepEqual(
    eight.matches.map((match) => stageSize(match.round)),
    [4, 4, 4, 4, 6, 6, 8],
  );
  assert.equal(new Set(eight.matches.map((match) => match.boardCode)).size, 7);
});

test('each match records two turns on one deal and advances its winner', () => {
  let tournament = create(4);
  const firstDeal = tournament.matches[0]?.boardCode;
  tournament = beginTournamentTurn(tournament);
  tournament = finishTournamentTurn(tournament, { moves: 22, elapsedMs: 20_000 }, CREATED);
  assert.equal(tournament.phase, 'betweenTurns');
  assert.equal(tournament.matches[0]?.boardCode, firstDeal);
  tournament = beginTournamentTurn(tournament);
  tournament = finishTournamentTurn(tournament, { moves: 18, elapsedMs: 80_000 }, CREATED);
  assert.equal(tournament.phase, 'betweenMatches');
  assert.equal(tournament.matches[0]?.winnerSeed, 4);
  assert.deepEqual(tournament.matches[2]?.players, [4, null]);
  tournament = advanceTournamentMatch(tournament);
  assert.equal(tournament.currentMatchIndex, 1);
  assert.equal(tournament.phase, 'ready');
});

test('moves lead result comparison, then active time and the higher seed break ties', () => {
  assert.ok(
    compareTournamentResults({ moves: 18, elapsedMs: 90_000 }, 4, { moves: 19, elapsedMs: 1 }, 1) <
      0,
  );
  assert.ok(
    compareTournamentResults(
      { moves: 18, elapsedMs: 80_000 },
      4,
      { moves: 18, elapsedMs: 90_000 },
      1,
    ) < 0,
  );
  assert.ok(
    compareTournamentResults(
      { moves: 18, elapsedMs: 80_000 },
      1,
      { moves: 18, elapsedMs: 80_000 },
      4,
    ) < 0,
  );
});

test('player names normalize before code-point length and group comparison', () => {
  assert.equal(normalizePlayerName('  Cafe\u0301   Lane  '), 'Café Lane');
  assert.equal(hasValidPlayerNames(['A😀', 'TwentyLettersHere']), true);
  assert.equal(hasValidPlayerNames(['A', 'A name that is much too long']), false);
  assert.equal(hasUniquePlayerNames(['Mira', 'mira']), false);
  assert.equal(hasUniquePlayerNames(['Mira', 'Mira 2']), true);
});
