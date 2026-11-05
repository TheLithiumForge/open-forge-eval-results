import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  createTournament,
  matchWinner,
  nextTournamentTurn,
  recordTournamentResult,
  TournamentPhase,
} from './rules.ts';
import { FOUR_NAMES, FOUR_CODES, EIGHT_NAMES, EIGHT_CODES } from './tournament.fixture.ts';
import { normalizeName, nameError } from './names.ts';

test('opening brackets use entry seeds and the prescribed stage sizes', () => {
  const four = createTournament(FOUR_NAMES, FOUR_CODES);
  assert.deepEqual(
    four.matches.map((match) => match.players),
    [
      [0, 3],
      [1, 2],
      [null, null],
    ],
  );
  assert.deepEqual(
    four.matches.map((match) => [match.round, match.size]),
    [
      ['Semifinal', 6],
      ['Semifinal', 6],
      ['Final', 8],
    ],
  );
  const eight = createTournament(EIGHT_NAMES, EIGHT_CODES);
  assert.deepEqual(
    eight.matches.map((match) => match.players),
    [
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
      [null, null],
      [null, null],
      [null, null],
    ],
  );
  assert.deepEqual(
    eight.matches.map((match) => match.size),
    [4, 4, 4, 4, 6, 6, 8],
  );
  assert.throws(() =>
    createTournament(FOUR_NAMES, [FOUR_CODES[0] ?? '', ...FOUR_CODES.slice(0, 2)]),
  );
  assert.throws(() => createTournament(FOUR_NAMES, ['np1-4-1', 'np1-6-2', 'np1-8-3']));
});

test('moves precede precise active time and original seed in winner comparison', () => {
  const match = createTournament(FOUR_NAMES, FOUR_CODES).matches[0];
  assert.ok(match);
  assert.equal(
    matchWinner({
      ...match,
      results: [
        { moves: 18, elapsedMs: 9000 },
        { moves: 19, elapsedMs: 1 },
      ],
    }),
    0,
  );
  assert.equal(
    matchWinner({
      ...match,
      results: [
        { moves: 18, elapsedMs: 100.5 },
        { moves: 18, elapsedMs: 100.25 },
      ],
    }),
    3,
  );
  assert.equal(
    matchWinner({
      ...match,
      players: [3, 0],
      results: [
        { moves: 18, elapsedMs: 100 },
        { moves: 18, elapsedMs: 100 },
      ],
    }),
    0,
  );
  assert.equal(matchWinner(match), null);
});

test('handoffs record one result, advance winners and finish both bracket sizes', () => {
  for (const [names, codes] of [
    [FOUR_NAMES, FOUR_CODES],
    [EIGHT_NAMES, EIGHT_CODES],
  ]) {
    assert.ok(names && codes);
    let state = createTournament(names, codes);
    assert.equal(nextTournamentTurn(state), state);
    assert.equal(recordTournamentResult(state, { moves: 18, elapsedMs: 1 }), state);
    for (let index = 0; index < names.length - 1; index += 1) {
      const code = state.matches[index]?.boardCode;
      state = recordTournamentResult(
        { ...state, phase: TournamentPhase.playing },
        { moves: 32, elapsedMs: 10 },
      );
      assert.equal(state.phase, TournamentPhase.turnComplete);
      state = nextTournamentTurn(state);
      assert.equal(state.turn, 1);
      assert.equal(state.matches[index]?.boardCode, code);
      state = recordTournamentResult(
        { ...state, phase: TournamentPhase.playing },
        { moves: 33, elapsedMs: 1 },
      );
      assert.equal(
        state.phase,
        index === names.length - 2 ? TournamentPhase.complete : TournamentPhase.matchComplete,
      );
      if (state.phase !== TournamentPhase.complete) state = nextTournamentTurn(state);
    }
    assert.equal(state.matches.at(-1)?.winner, 0);
    assert.equal(nextTournamentTurn(state), state);
  }
});

test('names use normalized whitespace, NFC, code-point limits and group equality', () => {
  assert.equal(normalizeName('  Cafe\u0301 \t Lovelace  '), 'Café Lovelace');
  assert.equal(nameError(['😀'.repeat(20), 'A😀']), null);
  for (const name of ['', 'A', '😀'.repeat(21)])
    assert.equal(nameError([name]), 'Use 2 to 20 characters.');
  assert.equal(nameError(['Mira', 'Ada', 'MIRA']), 'Each name must be different.');
  assert.throws(() => createTournament(['Ada', 'Bo', 'Cora', ' ADA '], FOUR_CODES));
});
