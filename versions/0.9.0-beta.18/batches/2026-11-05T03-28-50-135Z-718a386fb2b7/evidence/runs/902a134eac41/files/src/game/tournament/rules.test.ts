import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { MISMATCH_MS } from '../game.ts';
import {
  advanceTournamentMatch,
  advanceTournamentTurn,
  finishTournamentTurn,
  startTournamentTurn,
  tickTournament,
} from './transitions.ts';
import { createTournament, tournamentBoardSizes, validatePlayerNames } from './rules.ts';
import type { TournamentState } from './model.ts';

function completeGame(tournament: TournamentState, miss: boolean): TournamentState {
  let state = startTournamentTurn(tournament);
  const positions = new Map<number, number[]>();
  state.game.deck.forEach((face, index) => {
    const pair = positions.get(face) ?? [];
    pair.push(index);
    positions.set(face, pair);
  });
  const pairs = [...positions.values()].map((indices) => [indices[0], indices[1]] as const);
  if (miss) {
    const first = pairs[0];
    const second = pairs[1];
    const firstIndex = first?.[0];
    const secondIndex = second?.[0];
    if (firstIndex === undefined || secondIndex === undefined)
      throw new Error('Expected at least two pairs.');
    state = finishTournamentTurn(state, firstIndex, 100);
    state = finishTournamentTurn(state, secondIndex, 100);
    state = tickTournament(state, state.generation, MISMATCH_MS);
  }
  for (const pair of pairs) {
    if (pair[0] === undefined || pair[1] === undefined)
      throw new Error('Expected a complete pair.');
    state = finishTournamentTurn(state, pair[0], 100);
    state = finishTournamentTurn(state, pair[1], 100);
  }
  return state;
}

function completeMatch(
  tournament: TournamentState,
  firstMiss: boolean,
  secondMiss: boolean,
): TournamentState {
  const first = completeGame(tournament, firstMiss);
  assert.equal(first.phase, 'nextTurn');
  const secondStart = advanceTournamentTurn(first);
  assert.equal(secondStart.game.boardCode, tournament.game.boardCode);
  const second = completeGame(secondStart, secondMiss);
  assert.ok(second.phase === 'nextMatch' || second.phase === 'finished');
  return second;
}

test('opening brackets follow entry order and use the stage board sizes', () => {
  const fourCodes = tournamentBoardSizes(4).map((size, index) => boardCode(size, index + 1));
  const four = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], fourCodes, 1);
  assert.deepEqual(tournamentBoardSizes(4), [6, 6, 8]);
  assert.deepEqual(
    four.rounds[0]?.matches.map((match) => match.players),
    [
      [1, 4],
      [2, 3],
    ],
  );
  const eightCodes = tournamentBoardSizes(8).map((size, index) => boardCode(size, index + 1));
  const eight = createTournament(
    ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'],
    eightCodes,
    1,
  );
  assert.deepEqual(tournamentBoardSizes(8), [4, 4, 4, 4, 6, 6, 8]);
  assert.deepEqual(
    eight.rounds[0]?.matches.map((match) => match.players),
    [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ],
  );
});

test('four-player matches reuse a deal, record scores and advance winners to the champion', () => {
  const codes = tournamentBoardSizes(4).map((size, index) => boardCode(size, index + 1));
  let tournament = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], codes, 1);
  tournament = completeMatch(tournament, false, true);
  assert.equal(tournament.rounds[0]?.matches[0]?.winnerSeed, 1);
  tournament = advanceTournamentMatch(tournament);
  tournament = completeMatch(tournament, false, true);
  assert.equal(tournament.rounds[0]?.matches[1]?.winnerSeed, 2);
  tournament = advanceTournamentMatch(tournament);
  assert.deepEqual(tournament.rounds[1]?.matches[0]?.players, [1, 2]);
  assert.equal(tournament.game.size, 8);
  tournament = completeMatch(tournament, false, true);
  assert.equal(tournament.phase, 'finished');
  assert.equal(tournament.championSeed, 1);
  assert.equal(tournament.completedAtMs, 100);
});

test('eight-player brackets advance quarterfinals and semifinals to a champion', () => {
  const codes = tournamentBoardSizes(8).map((size, index) => boardCode(size, index + 1));
  let tournament = createTournament(
    ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'],
    codes,
    1,
  );
  for (let matchIndex = 0; matchIndex < 4; matchIndex += 1) {
    tournament = completeMatch(tournament, false, true);
    if (matchIndex < 3) tournament = advanceTournamentMatch(tournament);
  }
  tournament = advanceTournamentMatch(tournament);
  assert.deepEqual(
    tournament.rounds[1]?.matches.map((match) => match.players),
    [
      [1, 4],
      [3, 2],
    ],
  );
  for (let matchIndex = 0; matchIndex < 2; matchIndex += 1) {
    tournament = completeMatch(tournament, false, true);
    if (matchIndex === 0) tournament = advanceTournamentMatch(tournament);
  }
  tournament = advanceTournamentMatch(tournament);
  assert.deepEqual(tournament.rounds[2]?.matches[0]?.players, [1, 3]);
  tournament = completeMatch(tournament, false, true);
  assert.equal(tournament.phase, 'finished');
  assert.equal(tournament.championSeed, 1);
});

test('names are normalized before length and group-duplicate checks', () => {
  const accepted = validatePlayerNames(['  Ada   Lovelace ', 'B😀', 'Cafe\u0301', 'Dev'], 4);
  assert.deepEqual(accepted, {
    valid: true,
    names: ['Ada Lovelace', 'B😀', 'Café', 'Dev'],
  });
  assert.deepEqual(validatePlayerNames(['A', 'Bo', 'Cora', 'Dev'], 4), {
    valid: false,
    message: 'Use 2 to 20 characters.',
  });
  assert.deepEqual(validatePlayerNames(['Ada', 'ada', 'Cora', 'Dev'], 4), {
    valid: false,
    message: 'Each name must be different.',
  });
  assert.deepEqual(validatePlayerNames(['Ada', 'Bo', 'ada', 'Dev'], 4), {
    valid: false,
    message: 'Each name must be different.',
  });
  assert.equal(validatePlayerNames(['Al', 'Bo', 'Cora', 'Dev'], 4).valid, true);
  assert.equal(validatePlayerNames(['A'.repeat(20), 'Bo', 'Cora', 'Dev'], 4).valid, true);
  assert.deepEqual(validatePlayerNames(['A'.repeat(21), 'Bo', 'Cora', 'Dev'], 4), {
    valid: false,
    message: 'Use 2 to 20 characters.',
  });
});
