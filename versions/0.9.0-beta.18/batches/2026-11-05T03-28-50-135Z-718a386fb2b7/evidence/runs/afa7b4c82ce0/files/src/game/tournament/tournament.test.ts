import { expect, test } from 'vitest';
import { createTournament, currentMatch, nextMatch, recordResult } from './tournament.ts';
import { decodeTournament } from './decode-tournament.ts';

test('wins use moves first, time second, and player order as the final tie breaker', () => {
  const start = createTournament(['A', 'B', 'C', 'D'], 4);
  const first = recordResult(start, { moves: 8, elapsedMs: 10000 });
  const completed = recordResult(first, { moves: 9, elapsedMs: 1000 });
  expect(completed.rounds[0]?.[0]?.winner).toBe(0);
  const next = nextMatch(completed);
  const third = recordResult(next, { moves: 8, elapsedMs: 2000 });
  const fourth = recordResult(third, { moves: 8, elapsedMs: 1000 });
  expect(fourth.rounds[0]?.[1]?.winner).toBe(3);
  const final = nextMatch(fourth);
  expect(currentMatch(final).players).toEqual([0, 3]);
  const tie = recordResult(recordResult(final, { moves: 8, elapsedMs: 500 }), {
    moves: 8,
    elapsedMs: 500,
  });
  expect(nextMatch(tie).rounds.at(-1)?.[0]?.winner).toBe(0);
});

test('tournament JSON validates results, progression, and unfinished snapshots', () => {
  const start = createTournament(['A', 'B', 'C', 'D'], 4);
  expect(decodeTournament(JSON.stringify(start))).toEqual(start);
  const half = recordResult(start, { moves: 8, elapsedMs: 1000 });
  expect(decodeTournament(JSON.stringify(half))).toEqual(half);
  const corrupted = JSON.parse(JSON.stringify(half));
  corrupted.rounds[0][0].results[0].moves = 1;
  expect(decodeTournament(JSON.stringify(corrupted))).toBeNull();
  expect(
    decodeTournament(JSON.stringify({ ...start, phase: 'playing', snapshot: '{}' })),
  ).toBeNull();
});

test('eight players advance through seven matches to a champion', () => {
  let tournament = createTournament(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 4);
  for (let match = 0; match < 7; match++) {
    tournament = recordResult(tournament, { moves: 8, elapsedMs: 1000 });
    tournament = recordResult(tournament, { moves: 9, elapsedMs: 500 });
    tournament = nextMatch(tournament);
  }
  expect(tournament.phase).toBe('complete');
  expect(tournament.rounds.map((round) => round.length)).toEqual([4, 2, 1]);
  expect(tournament.rounds.at(-1)?.[0]?.winner).toBe(0);
  expect(decodeTournament(JSON.stringify(tournament))).toEqual(tournament);
});
