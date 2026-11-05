import { expect, test } from 'vitest';
import { boardCode } from '../deck.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { createGame } from '../game.ts';
import {
  advanceTournament,
  createTournament,
  currentMatch,
  finishTurn,
  startTurn,
} from './tournament.ts';
import { readTournament } from './read-tournament.ts';

for (const count of [4, 8]) {
  test(`${count} players advance through a knockout and round-trip the bracket`, () => {
    let tournament = createTournament(
      Array.from({ length: count }, (_, i) => `Player ${i + 1}`),
      4,
      'test',
    );
    const code = boardCode(4, 1);
    let matches = 0;
    while (tournament.phase !== 'complete') {
      tournament = startTurn(tournament, code);
      tournament = finishTurn(tournament, { moves: 8, elapsedMs: 2000 });
      tournament = advanceTournament(tournament);
      expect(currentMatch(tournament).boardCode).toBe(code);
      tournament = startTurn(tournament, code);
      tournament = finishTurn(tournament, { moves: 8, elapsedMs: 1000 });
      matches += 1;
      expect(readTournament(JSON.stringify({ tournament, snapshot: null }))?.tournament).toEqual(
        tournament,
      );
      if (tournament.phase === 'matchEnd') tournament = advanceTournament(tournament);
    }
    expect(matches).toBe(count - 1);
    expect(currentMatch(tournament).winner).toBe(count - 1);
  });
}

test('a live turn round-trips and rejects altered brackets and snapshots', () => {
  const code = boardCode(4, 7);
  const tournament = startTurn(createTournament(['A', 'B', 'C', 'D'], 4, 'test'), code);
  const snapshot = encodeSnapshot(createGame(code));
  expect(readTournament(JSON.stringify({ tournament, snapshot }))?.snapshot).toBe(snapshot);
  expect(
    readTournament(
      JSON.stringify({ tournament, snapshot: encodeSnapshot(createGame(boardCode(4, 8))) }),
    ),
  ).toBeNull();
  tournament.rounds[0]![0]!.players[0] = 3;
  expect(readTournament(JSON.stringify({ tournament, snapshot }))).toBeNull();
});
