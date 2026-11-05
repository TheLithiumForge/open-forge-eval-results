import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  advanceTournament,
  createTournament,
  currentPlayer,
  matchWinner,
  normalizePlayerName,
  playerNamesError,
  playTournamentCard,
  startTournamentTurn,
  tournamentRound,
} from './rules.ts';
import { TournamentPhase } from './model.ts';
import { finishTournamentTurn, TOURNAMENT_NAMES } from './tournament.fixture.ts';

test('player names normalize spacing and Unicode before length and group comparison', () => {
  assert.equal(normalizePlayerName('  Cafe\u0301\t  Noir  '), 'Café Noir');
  assert.equal(playerNamesError(['A']), 'Use 2 to 20 characters.');
  assert.equal(playerNamesError(['😀'.repeat(20)]), '');
  assert.equal(playerNamesError(['😀'.repeat(21)]), 'Use 2 to 20 characters.');
  assert.equal(playerNamesError(['Ada', 'Bo', ' ada ']), 'Each name must be different.');
  assert.equal(playerNamesError(['Café', 'Cafe\u0301']), 'Each name must be different.');
  assert.equal(playerNamesError(['Al', 'Bo']), '');
});

test('entry seeds produce the specified four and eight player opening order', () => {
  const four = createTournament(TOURNAMENT_NAMES.slice(0, 4), 1);
  const eight = createTournament(TOURNAMENT_NAMES, 2_147_483_646);
  assert.deepEqual(
    four.matches.map((match) => match.players),
    [[0, 3], [1, 2], []],
  );
  assert.deepEqual(
    eight.matches.map((match) => match.players),
    [[0, 7], [3, 4], [2, 5], [1, 6], [], [], []],
  );
  assert.deepEqual(
    eight.matches.map((_, index) => tournamentRound(8, index).size),
    [4, 4, 4, 4, 6, 6, 8],
  );
  assert.deepEqual(
    four.matches.map((_, index) => tournamentRound(4, index).name),
    ['Semifinal', 'Semifinal', 'Final'],
  );
  assert.equal(new Set(eight.matches.map((match) => match.boardCode)).size, 7);
  assert.equal(eight.matches[1]!.boardCode, 'np1-4-1');
});

test('results compare moves first, exact active time next and highest entry seed last', () => {
  const match = { boardCode: 'np1-4-1', players: [3, 1], winner: null };
  assert.equal(
    matchWinner({
      ...match,
      results: [
        { moves: 8, elapsedMs: 2000 },
        { moves: 9, elapsedMs: 1000 },
      ],
    }),
    3,
  );
  assert.equal(
    matchWinner({
      ...match,
      results: [
        { moves: 9, elapsedMs: 1000.2 },
        { moves: 9, elapsedMs: 1000.1 },
      ],
    }),
    1,
  );
  assert.equal(
    matchWinner({
      ...match,
      results: [
        { moves: 9, elapsedMs: 1000 },
        { moves: 9, elapsedMs: 1000 },
      ],
    }),
    1,
  );
  assert.equal(matchWinner({ ...match, results: [] }), null);
});

for (const count of [4, 8])
  test(`${count} players play every match on shared deals and advance into a champion`, () => {
    let tournament = createTournament(TOURNAMENT_NAMES.slice(0, count), 73);
    assert.equal(playTournamentCard(tournament, 0), tournament);
    for (let match = 0; match < count - 1; match += 1) {
      assert.equal(tournament.currentMatch, match);
      const code = tournament.game.boardCode;
      const players = tournament.matches[match]!.players;
      assert.equal(players.length, 2);
      assert.equal(currentPlayer(tournament), players[0]);
      tournament = finishTournamentTurn(tournament);
      assert.equal(tournament.phase, TournamentPhase.turnComplete);
      assert.equal(playTournamentCard(tournament, 0), tournament);
      tournament = advanceTournament(tournament);
      assert.equal(currentPlayer(tournament), players[1]);
      assert.equal(tournament.game.boardCode, code);
      assert.equal(tournament.game.moves, 0);
      assert.equal(tournament.game.elapsedMs, 0);
      assert.equal(tournament.game.started, false);
      tournament = finishTournamentTurn(tournament);
      assert.equal(tournament.matches[match]!.winner, Math.min(...players));
      if (match < count - 2) {
        assert.equal(tournament.phase, TournamentPhase.matchComplete);
        tournament = advanceTournament(tournament);
      }
    }
    assert.equal(tournament.phase, TournamentPhase.complete);
    assert.equal(tournament.matches.at(-1)!.winner, 0);
    assert.equal(advanceTournament(tournament), tournament);
    assert.equal(startTournamentTurn(tournament), tournament);
  });
