import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame } from '../game.ts';
import { boardCode } from '../deck.ts';
import { activateSession, initialSession } from '../session/session.ts';
import { tournamentDeals } from '../session/tournament-deals.ts';
import {
  createTournament,
  finishTournamentTurn,
  matchPlayers,
  matchWinner,
  nextTournamentTurn,
  normalizePlayerName,
  playerNameErrors,
  startTournamentTurn,
  tournamentRound,
} from './rules.ts';
import { TournamentPhase } from './types.ts';

test('names normalize spacing and Unicode before code point and case insensitive duplicate checks', () => {
  assert.equal(normalizePlayerName('  Cafe\u0301\t  Noir  '), 'Café Noir');
  assert.deepEqual(playerNameErrors(['A😀', '😀'.repeat(20)]), ['', '']);
  assert.deepEqual(playerNameErrors(['A', 'x'.repeat(21)]), [
    'Use 2 to 20 characters.',
    'Use 2 to 20 characters.',
  ]);
  assert.deepEqual(playerNameErrors([' Cafe\u0301 ', 'CAFÉ']), [
    'Each name must be different.',
    'Each name must be different.',
  ]);
});

test('entry order gives the documented four and eight player brackets and round boards', () => {
  const four = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], ['np1-6-1', 'np1-6-2', 'np1-8-3']);
  assert.deepEqual(
    [0, 1, 2].map((index) => matchPlayers(four, index)),
    [
      [0, 3],
      [1, 2],
      [null, null],
    ],
  );
  const eight = createTournament(
    ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'],
    tournamentDeals(8),
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((index) => matchPlayers(eight, index)),
    [
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ],
  );
  assert.deepEqual(
    [0, 3, 4, 5, 6].map((index) => tournamentRound(8, index)),
    [
      { name: 'Quarterfinal', size: 4 },
      { name: 'Quarterfinal', size: 4 },
      { name: 'Semifinal', size: 6 },
      { name: 'Semifinal', size: 6 },
      { name: 'Final', size: 8 },
    ],
  );
  assert.equal(new Set(eight.matches.map((match) => match.boardCode)).size, 7);
});

test('both bracket sizes advance only completed turns and compare moves, precise time, then seed', () => {
  for (const count of [4, 8]) {
    let item = createTournament(
      Array.from({ length: count }, (_, index) => `Player ${index + 1}`),
      Array.from({ length: count - 1 }, (_, index) =>
        boardCode(tournamentRound(count, index).size, index + 1),
      ),
    );
    assert.equal(nextTournamentTurn(item), item);
    for (let index = 0; index < count - 1; index++) {
      const code = item.matches[index]?.boardCode;
      assert.ok(code);
      const board = createGame(code);
      assert.equal(finishTournamentTurn(item, board), item);
      for (let turn = 0; turn < 2; turn++) {
        item = startTournamentTurn(item);
        assert.equal(finishTournamentTurn(item, board), item);
        item = finishTournamentTurn(item, {
          ...board,
          matched: board.deck.map((_, index) => index),
          moves: board.deck.length / 2 + (index === 0 && turn === 0 ? 1 : 0),
          elapsedMs: index === 1 ? 100.75 - turn * 0.25 : 100,
          started: true,
        });
        assert.equal(
          item.phase,
          turn === 0
            ? TournamentPhase.turnComplete
            : index === count - 2
              ? TournamentPhase.complete
              : TournamentPhase.matchComplete,
        );
        if (turn === 0 || index !== count - 2) item = nextTournamentTurn(item);
      }
      const players = matchPlayers(item, index);
      assert.equal(
        matchWinner(item, index),
        index < 2 ? players[1] : Math.min(...players.filter((value) => value !== null)),
      );
    }
    assert.equal(item.phase, TournamentPhase.complete);
    assert.equal(nextTournamentTurn(item), item);
    assert.equal(startTournamentTurn(item), item);
  }
});

test('tournament completion leaves the supplied solo preferences untouched', () => {
  let session = initialSession('np1-4-1', { size: 10, bestMoves: { '4': 12 } });
  const preferences = session.preferences;
  const positions = new Map<number, number[]>();
  session.game.deck.forEach((face, index) =>
    positions.set(face, [...(positions.get(face) ?? []), index]),
  );
  for (const pair of positions.values())
    for (const index of pair) session = activateSession(session, index, false);
  assert.equal(session.preferences, preferences);
  assert.deepEqual(preferences, { size: 10, bestMoves: { '4': 12 } });
});
