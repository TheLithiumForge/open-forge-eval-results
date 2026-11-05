import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard } from '../game.ts';
import { completeSampleTurn, sampleTournament } from './tournament.fixture.ts';
import {
  advanceTournament,
  finishTournamentTurn,
  startTournamentTurn,
  tournamentBracket,
} from './tournament.ts';

test('a match gates each turn and gives both players the identical fresh deal', () => {
  const ready = sampleTournament();
  const first = startTournamentTurn(ready);
  assert.equal(first.stage, 'playing');
  assert.equal(startTournamentTurn(first), first);
  const game = first.game;
  assert.ok(game);
  assert.equal(finishTournamentTurn(ready, game), ready);
  assert.equal(finishTournamentTurn(first, activateCard(game, 0)), first);
  const done = completeSampleTurn(first, 10, 2500.75);
  assert.equal(done.stage, 'turn-complete');
  assert.deepEqual(done.results, [{ moves: 10, elapsedMs: 2500 }]);
  assert.equal(done.game, null);
  assert.equal(startTournamentTurn(done), done);
  const second = startTournamentTurn(advanceTournament(done));
  assert.deepEqual(second.game, game);
  const matched = completeSampleTurn(second, 8, 60_000);
  assert.equal(matched.stage, 'match-complete');
  assert.equal(tournamentBracket(matched)[0]?.winner, 1, 'fewer moves beat faster time');
  assert.equal(finishTournamentTurn(matched, game), matched);
});

test('ties use elapsed milliseconds and then the first player listed', () => {
  const first = completeSampleTurn(sampleTournament(), 8, 1001);
  const faster = completeSampleTurn(first, 8, 1000);
  assert.equal(tournamentBracket(faster)[0]?.winner, 1);
  const tied = completeSampleTurn(first, 8, 1001);
  assert.equal(tournamentBracket(tied)[0]?.winner, 0);
});

for (const count of [4, 8]) {
  test(`${count} players advance winners through every round to a single champion`, () => {
    let tournament = sampleTournament(count);
    assert.equal(tournamentBracket(tournament).length, count - 1);
    for (let match = 0; match < count - 1; match++) {
      const first = completeSampleTurn(tournament, 10, 1000);
      const second = completeSampleTurn(first, 8, 2000);
      const bracket = tournamentBracket(second);
      assert.equal(bracket[match]?.winner, bracket[match]?.players[1]);
      if (match < count - 2) {
        assert.equal(second.stage, 'match-complete');
        tournament = advanceTournament(second);
        const next = bracket[match + 1];
        assert.ok(next?.players.every((player) => player !== null));
      } else tournament = second;
    }
    assert.equal(tournament.stage, 'complete');
    assert.equal(tournament.results.length, (count - 1) * 2);
    assert.equal(tournamentBracket(tournament).at(-1)?.winner, count - 1);
    assert.equal(advanceTournament(tournament), tournament);
    assert.equal(startTournamentTurn(tournament), tournament);
  });
}
