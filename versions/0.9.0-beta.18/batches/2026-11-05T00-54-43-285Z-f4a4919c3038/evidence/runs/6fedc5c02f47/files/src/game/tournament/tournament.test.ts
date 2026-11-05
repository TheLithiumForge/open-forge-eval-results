import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { createGame } from '../game.ts';
import { tournamentBracket } from './bracket.ts';
import {
  createTournament,
  finishTournamentTurn,
  startTournamentTurn,
  advanceTournament,
} from './tournament.ts';
import {
  exampleTournament,
  finishExampleTurn,
  finishExampleTournament,
} from './tournament.fixture.ts';

for (const count of [4, 8]) {
  test(`${count} players advance through the knockout with fresh turns on the same match deal`, () => {
    let progress = exampleTournament(count);
    assert.equal(tournamentBracket(progress.tournament).length, count - 1);
    for (let index = 0; index < count - 1; index++) {
      const first = startTournamentTurn(progress);
      assert.equal(first.phase, 'playing');
      assert.equal(first.game?.moves, 0);
      assert.equal(first.game?.elapsedMs, 0);
      assert.equal(first.game?.started, true);
      progress = finishExampleTurn(first, 9, 1000);
      assert.equal(progress.phase, 'turn-complete');
      progress = advanceTournament(progress, boardCode(4, 100));
      assert.equal(progress.phase, 'ready');
      const second = startTournamentTurn(progress);
      assert.equal(second.game?.boardCode, first.game?.boardCode);
      assert.deepEqual(second.game?.deck, first.game?.deck);
      assert.deepEqual(second.game?.matched, []);
      assert.equal(second.game?.moves, 0);
      assert.equal(second.game?.elapsedMs, 0);
      progress = finishExampleTurn(second, 8, 2000);
      const match = tournamentBracket(progress.tournament)[index];
      assert.equal(match?.winner, match?.players[1], 'fewer moves wins despite a slower time');
      if (index < count - 2) {
        assert.equal(progress.phase, 'match-complete');
        progress = advanceTournament(progress, boardCode(4, 100));
        assert.equal(progress.matchIndex, index + 1);
      }
    }
    assert.equal(progress.phase, 'complete');
    assert.equal(tournamentBracket(progress.tournament).at(-1)?.winner, count - 1);
    assert.equal(advanceTournament(progress, boardCode(4, 100)), progress);
  });
}

test('equal moves use faster time and exact ties replay the same entrants on a new deal', () => {
  let progress = finishExampleTurn(exampleTournament(), 8, 2000);
  progress = advanceTournament(progress, boardCode(4, 100));
  progress = finishExampleTurn(progress, 8, 1000);
  assert.equal(tournamentBracket(progress.tournament)[0]?.winner, 1);
  let tie = finishExampleTurn(exampleTournament(), 8, 1000);
  tie = advanceTournament(tie, boardCode(4, 100));
  tie = finishExampleTurn(tie, 8, 1000);
  assert.equal(tie.phase, 'match-complete');
  assert.equal(tournamentBracket(tie.tournament)[0]?.winner, null);
  const replayed = advanceTournament(tie, boardCode(4, 100));
  assert.equal(replayed.phase, 'ready');
  assert.equal(replayed.matchIndex, 0);
  assert.deepEqual(replayed.tournament.matches[0], { boardCode: boardCode(4, 100), results: [] });
  assert.deepEqual(tournamentBracket(replayed.tournament)[0]?.players, [0, 1]);
});

test('only the active finished deal can record a result and repeated completion is ignored', () => {
  const ready = exampleTournament();
  const playing = startTournamentTurn(ready);
  assert.equal(finishTournamentTurn(ready, createGame('np1-4-1')), ready);
  assert.equal(finishTournamentTurn(playing, createGame('np1-4-1')), playing);
  const won = {
    ...createGame('np1-4-2'),
    matched: Array.from({ length: 16 }, (_, index) => index),
  };
  assert.equal(finishTournamentTurn(playing, won), playing);
  const finished = finishExampleTurn(playing);
  assert.equal(startTournamentTurn(finished), finished);
  assert.equal(finishTournamentTurn(finished, won), finished);
  assert.equal(advanceTournament(playing, 'np1-4-100'), playing);
});

test('names trim and setup rejects unsupported counts and blank entrants', () => {
  const example = exampleTournament();
  const codes = example.tournament.matches.map((match) => match.boardCode);
  assert.equal(
    createTournament([' A ', 'B', 'C', 'D'], codes, 'names', 0).tournament.players[0],
    'A',
  );
  for (const names of [
    ['A', 'B'],
    ['A', 'B', 'C', ' '],
  ])
    assert.throws(() => createTournament(names, codes, 'bad', 0));
  assert.throws(() => createTournament(['A', 'B', 'C', 'D'], [], 'bad', 0));
  const bracket = tournamentBracket(finishExampleTournament(8).tournament);
  assert.deepEqual(
    bracket.slice(4).map((match) => match.players),
    [
      [1, 3],
      [5, 7],
      [3, 7],
    ],
  );
});
