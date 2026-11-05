import assert from 'node:assert/strict';
import { test } from 'vitest';
import { advanceTournament, currentTournamentMatch, finishTournamentTurn } from './tournament.ts';
import { completedTournament, sampleTournament } from './tournament.fixture.ts';

for (const count of [4, 8]) {
  test(`${count} players advance through every knockout round in order`, () => {
    let tournament = sampleTournament(count);
    assert.equal(tournament.matches.length, count - 1);
    assert.equal(tournament.phase, 'ready');
    for (let index = 0; index < count - 1; index++) {
      assert.equal(tournament.currentMatch, index);
      const match = currentTournamentMatch(tournament);
      assert.ok(match.players.every((player) => player !== null));
      const initial = tournament;
      tournament = finishTournamentTurn(
        { ...tournament, phase: 'playing' },
        {
          moves: 9,
          elapsedMs: 1000,
        },
      );
      assert.equal(tournament.phase, 'turnComplete');
      assert.deepEqual(initial.matches[index]?.results, [null, null]);
      assert.equal(finishTournamentTurn(tournament, { moves: 8, elapsedMs: 0 }), tournament);
      tournament = advanceTournament(tournament);
      assert.equal(tournament.turn, 1);
      assert.equal(currentTournamentMatch(tournament).boardCode, match.boardCode);
      tournament = finishTournamentTurn(
        { ...tournament, phase: 'playing' },
        {
          moves: 8,
          elapsedMs: 5000,
        },
      );
      assert.equal(currentTournamentMatch(tournament).winner, match.players[1]);
      assert.equal(tournament.phase, index === count - 2 ? 'complete' : 'matchComplete');
      tournament = advanceTournament(tournament);
    }
    assert.equal(tournament.matches.at(-1)?.winner, count - 1);
    assert.equal(advanceTournament(tournament), tournament);
    assert.deepEqual(tournament.matches.at(-1)?.players, count === 4 ? [1, 3] : [3, 7]);
  });
}

test('moves rank before time, equal moves use time and exact ties advance the first player', () => {
  for (const [first, second, winner] of [
    [{ moves: 8, elapsedMs: 9000 }, { moves: 9, elapsedMs: 1000 }, 0],
    [{ moves: 9, elapsedMs: 1000 }, { moves: 8, elapsedMs: 9000 }, 1],
    [{ moves: 8, elapsedMs: 1000 }, { moves: 8, elapsedMs: 2000 }, 0],
    [{ moves: 8, elapsedMs: 2000 }, { moves: 8, elapsedMs: 1000 }, 1],
    [{ moves: 8, elapsedMs: 1000 }, { moves: 8, elapsedMs: 1000 }, 0],
  ] as const) {
    const played = finishTournamentTurn(sampleTournament(), first);
    const finished = finishTournamentTurn(advanceTournament(played), second);
    assert.equal(currentTournamentMatch(finished).winner, winner);
  }
  assert.equal(completedTournament().phase, 'complete');
});
