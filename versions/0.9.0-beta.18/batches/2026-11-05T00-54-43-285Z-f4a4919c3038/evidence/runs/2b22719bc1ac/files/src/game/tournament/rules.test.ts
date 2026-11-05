import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { normalizeName, nameError } from './names.ts';
import {
  createTournament,
  finishTurn,
  matchRound,
  nextMatch,
  nextTurn,
  startTurn,
  TournamentPhase,
} from './rules.ts';
import type { TournamentState } from './rules.ts';

function event(count: number): TournamentState {
  return createTournament(
    Array.from({ length: count }, (_, i) => `Player ${i + 1}`),
    Array.from({ length: count - 1 }, (_, i) => boardCode(matchRound(count, i).size, i + 1)),
  );
}

test('entry order fixes both opening brackets and the stage sizes', () => {
  const four = event(4);
  assert.deepEqual(
    four.matches.map((match) => match.players),
    [[0, 3], [1, 2], []],
  );
  const eight = event(8);
  assert.deepEqual(
    eight.matches.slice(0, 4).map((match) => match.players),
    [
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ],
  );
  assert.deepEqual(
    eight.matches.map((_, i) => matchRound(8, i)),
    [
      { name: 'Quarterfinal', size: 4 },
      { name: 'Quarterfinal', size: 4 },
      { name: 'Quarterfinal', size: 4 },
      { name: 'Quarterfinal', size: 4 },
      { name: 'Semifinal', size: 6 },
      { name: 'Semifinal', size: 6 },
      { name: 'Final', size: 8 },
    ],
  );
});

test('moves win first, fractional active time second, and the higher seed settles equality', () => {
  const cases = [
    [{ moves: 18, elapsedMs: 900 }, { moves: 19, elapsedMs: 0 }, 0],
    [{ moves: 18, elapsedMs: 100.9 }, { moves: 18, elapsedMs: 100.8 }, 3],
    [{ moves: 18, elapsedMs: 100.8 }, { moves: 18, elapsedMs: 100.8 }, 0],
  ] as const;
  for (const [first, second, winner] of cases) {
    let state = event(4);
    assert.equal(finishTurn(state, first), state);
    state = finishTurn(startTurn(state), first);
    assert.equal(state.phase, TournamentPhase.turnDone);
    assert.equal(state.matches[0]?.winner, null);
    state = finishTurn(startTurn(nextTurn(state)), second);
    assert.equal(state.matches[0]?.winner, winner);
    assert.equal(state.phase, TournamentPhase.matchDone);
    assert.deepEqual(state.matches[2]?.players, [winner]);
  }
});

test('both supported tournaments advance adjacent winners through the final exactly once', () => {
  for (const count of [4, 8]) {
    let state = event(count);
    for (let match = 0; match < count - 1; match += 1) {
      const moves = matchRound(count, match).size ** 2 / 2;
      state = finishTurn(startTurn(state), { moves, elapsedMs: 1 });
      state = finishTurn(startTurn(nextTurn(state)), { moves, elapsedMs: 1 });
      if (match < count - 2) state = nextMatch(state);
    }
    assert.equal(state.phase, TournamentPhase.complete);
    assert.equal(state.matches.at(-1)?.winner, 0);
    assert.equal(finishTurn(state, { moves: 32, elapsedMs: 0 }), state);
    assert.deepEqual(state.matches.at(-1)?.players, [0, 1]);
  }
});

test('names normalize whitespace and NFC before code point length and group comparison', () => {
  assert.equal(normalizeName('  Ada\t  Lovelace  '), 'Ada Lovelace');
  assert.equal(normalizeName('Cafe\u0301'), 'Café');
  assert.equal(nameError(['A😀', '😀'.repeat(20), 'Al', 'Bo']), '');
  for (const name of ['', 'A', '😀'.repeat(21)])
    assert.equal(nameError([name, 'Bo', 'Cy', 'De']), 'Use 2 to 20 characters.');
  assert.equal(nameError(['Ada', 'Bo', 'Cy', '  ADA ']), 'Each name must be different.');
  assert.equal(nameError(['Café', 'Bo', 'Cy', 'Cafe\u0301']), 'Each name must be different.');
});

test('deals cannot repeat or use the wrong stage size', () => {
  const names = ['Ada', 'Bo', 'Cy', 'De'];
  assert.throws(() => createTournament(names, ['np1-6-1', 'np1-6-1', 'np1-8-1']));
  assert.throws(() => createTournament(names, ['np1-4-1', 'np1-6-2', 'np1-8-1']));
});
