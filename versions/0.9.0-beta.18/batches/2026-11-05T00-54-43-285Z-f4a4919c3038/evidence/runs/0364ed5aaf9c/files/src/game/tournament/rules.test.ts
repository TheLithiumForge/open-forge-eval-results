import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  finishTournamentTurn,
  isTournamentComplete,
  nameProblem,
  nextTournamentTurn,
  normalizeName,
  tournamentBracket,
  TournamentPhase,
} from './rules.ts';
import { tournamentFixture, wonTournamentGame } from './tournament.fixture.ts';

test('accepted names normalize whitespace and NFC and count Unicode code points', () => {
  assert.equal(normalizeName('  Zoe\u0308  \t Lee  '), 'Zoë Lee');
  assert.equal(nameProblem(['A😀', 'Zoë', 'Bo', 'Qi']), null);
  assert.equal(nameProblem(['A', 'Bo', 'Qi', 'Dev']), 'Use 2 to 20 characters.');
  assert.equal(nameProblem(['😀'.repeat(20), 'Bo', 'Qi', 'Dev']), null);
  assert.equal(nameProblem(['😀'.repeat(21), 'Bo', 'Qi', 'Dev']), 'Use 2 to 20 characters.');
  assert.equal(nameProblem([' Ada ', 'Bo', 'Cora', 'ADA']), 'Each name must be different.');
  assert.equal(nameProblem(['Zoe\u0308', 'Bo', 'Cora', 'ZOË']), 'Each name must be different.');
});

test('opening pairings and stage sizes follow the four and eight entrant brackets', () => {
  for (const count of [4, 8]) {
    const tournament = tournamentFixture(count);
    const bracket = tournamentBracket(tournament);
    assert.deepEqual(
      bracket.slice(0, count / 2).map((match) => match.players),
      count === 4
        ? [
            [0, 3],
            [1, 2],
          ]
        : [
            [0, 7],
            [3, 4],
            [2, 5],
            [1, 6],
          ],
    );
    assert.deepEqual(
      bracket.map((match) => match.size),
      count === 4 ? [6, 6, 8] : [4, 4, 4, 4, 6, 6, 8],
    );
    assert.equal(bracket.at(-1)?.round, 'Final');
  }
});

test('fewer moves precedes fractional active time and then original entry seed', () => {
  const tournament = tournamentFixture();
  const decide = (moves: number, elapsedMs: number, otherMoves: number, otherTime: number) =>
    tournamentBracket({
      ...tournament,
      results: [
        { moves, elapsedMs },
        { moves: otherMoves, elapsedMs: otherTime },
      ],
    })[0]?.winner;
  assert.equal(decide(18, 100, 19, 0), 0);
  assert.equal(decide(19, 0, 18, 100), 3);
  assert.equal(decide(18, 1.9, 18, 1.1), 3);
  assert.equal(decide(18, 1.1, 18, 1.9), 0);
  assert.equal(decide(18, 1.1, 18, 1.1), 0);
});

test('each player starts the match deal hidden and winners advance through every round', () => {
  for (const count of [4, 8]) {
    let tournament = tournamentFixture(count);
    const codes: string[] = [];
    for (let index = 0; index < (count - 1) * 2; index++) {
      assert.equal(tournament.phase, TournamentPhase.ready);
      assert.equal(tournament.game.moves, 0);
      assert.equal(tournament.game.started, false);
      codes.push(tournament.game.boardCode);
      const game = wonTournamentGame(tournament.game);
      tournament = finishTournamentTurn({ ...tournament, phase: TournamentPhase.playing }, game);
      assert.equal(finishTournamentTurn(tournament, game), tournament);
      if (index < (count - 1) * 2 - 1) tournament = nextTournamentTurn(tournament);
    }
    for (let index = 0; index < codes.length; index += 2)
      assert.equal(codes[index], codes[index + 1]);
    assert.equal(new Set(codes).size, count - 1);
    assert.ok(isTournamentComplete(tournament));
    assert.equal(tournamentBracket(tournament).at(-1)?.winner, 0);
    assert.equal(nextTournamentTurn(tournament), tournament);
  }
});
