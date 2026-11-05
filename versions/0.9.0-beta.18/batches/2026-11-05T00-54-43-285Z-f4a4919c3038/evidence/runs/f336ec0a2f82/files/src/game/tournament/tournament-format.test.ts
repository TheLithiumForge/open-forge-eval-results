import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame, ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { decodeTournament, encodeTournament, TOURNAMENT_JSON_LIMIT } from './tournament-format.ts';
import { advanceTournament, currentTournamentMatch, finishTournamentTurn } from './tournament.ts';
import { completedTournament, sampleTournament } from './tournament.fixture.ts';
import type { TournamentArchive } from './tournament-format.ts';
import type { TournamentMatch, TournamentState } from './tournament.ts';

function archive(tournament: TournamentState | null): TournamentArchive {
  return { version: 1, tournament, pastTournaments: [completedTournament()] };
}

for (const count of [4, 8]) {
  test(`every handoff and finished bracket round trips for ${count} players`, () => {
    let tournament = sampleTournament(count);
    while (true) {
      const saved = archive(tournament);
      assert.deepEqual(decodeTournament(encodeTournament(saved)), saved);
      if (tournament.phase === 'complete') break;
      tournament = advanceTournament(tournament);
      assert.deepEqual(
        decodeTournament(encodeTournament(archive(tournament))),
        archive(tournament),
      );
      const game = activateCard(createGame(currentTournamentMatch(tournament).boardCode), 0);
      const playing: TournamentState = {
        ...tournament,
        phase: 'playing',
        snapshot: encodeSnapshot(game),
      };
      assert.deepEqual(decodeTournament(encodeTournament(archive(playing)))?.tournament, {
        ...playing,
        phase: 'ready',
      });
      tournament = finishTournamentTurn(tournament, { moves: 8, elapsedMs: 1000 });
    }
  });
}

test('setup and finished history round trip without an active tournament', () => {
  const saved = archive(null);
  assert.deepEqual(decodeTournament(encodeTournament(saved)), saved);
});

test('invalid input rejects inconsistent progress, forged winners and damaged snapshots', () => {
  const initial = sampleTournament();
  const finished = completedTournament();
  const match = currentTournamentMatch(initial);
  const invalid: unknown[] = [
    null,
    {},
    { ...archive(initial), version: 2 },
    { ...archive(initial), extra: true },
    archive({ ...initial, players: ['A', 'B'] }),
    archive({ ...initial, players: ['', 'B', 'C', 'D'] }),
    archive({ ...initial, currentMatch: 9 }),
    archive({ ...initial, phase: 'complete' }),
    archive({ ...initial, phase: 'playing' }),
    archive({ ...initial, snapshot: '{}' }),
    archive({ ...initial, snapshot: encodeSnapshot(createGame('np1-4-99')) }),
    archive({ ...initial, matches: [{ ...match, boardCode: 'bad' }, ...initial.matches.slice(1)] }),
    archive({ ...initial, matches: [{ ...match, winner: 0 }, ...initial.matches.slice(1)] }),
    archive({ ...initial, matches: [{ ...match, players: [1, 0] }, ...initial.matches.slice(1)] }),
    { ...archive(null), pastTournaments: [initial] },
    { ...archive(null), pastTournaments: [finished, finished] },
  ];
  for (const score of [
    { moves: 7, elapsedMs: 0 },
    { moves: MOVES_MAX + 1, elapsedMs: 0 },
    { moves: 8, elapsedMs: -1 },
    { moves: 8, elapsedMs: ELAPSED_MAX_MS + 1 },
    { moves: 8.5, elapsedMs: 1000 },
    { moves: 8, elapsedMs: 1.5 },
  ])
    invalid.push(archive(finishTournamentTurn(initial, score)));
  const hole: TournamentMatch = { ...match, results: [null, { moves: 8, elapsedMs: 0 }] };
  invalid.push(archive({ ...initial, matches: [hole, ...initial.matches.slice(1)] }));
  for (const value of invalid) assert.equal(decodeTournament(JSON.stringify(value)), null);
  assert.equal(decodeTournament('{'), null);
  assert.equal(decodeTournament(' '.repeat(TOURNAMENT_JSON_LIMIT + 1)), null);
});
