import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import {
  decodeTournament,
  encodeTournament,
  readTournament,
  savedTournament,
  TOURNAMENT_MAX_BYTES,
  TOURNAMENT_VERSION,
} from './tournament-format.ts';
import {
  EIGHT_PLAYERS,
  FOUR_PLAYERS,
  firstPlayersWin,
  newTournament,
  playTurns,
  turn,
} from './tournament.fixture.ts';

function saved(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...savedTournament(playTurns(newTournament(FOUR_PLAYERS), [turn(8), turn(9)])),
    ...overrides,
  };
}

function match(boardCodeText: unknown, turns: unknown[] = []): Record<string, unknown> {
  return { boardCode: boardCodeText, turns };
}

test('unplayed, unfinished and finished tournaments round trip through their JSON', () => {
  for (const players of [FOUR_PLAYERS, EIGHT_PLAYERS]) {
    const fresh = newTournament(players);
    const partial = playTurns(fresh, [turn(8), turn(9), turn(12, 3000)]);
    for (const tournament of [fresh, partial, firstPlayersWin(fresh)])
      assert.deepEqual(decodeTournament(encodeTournament(tournament)), tournament);
  }
});

test('the saved tournament holds only its version, players and matches', () => {
  const exported = savedTournament(playTurns(newTournament(FOUR_PLAYERS), [turn(8, 1500)]));
  assert.deepEqual(Object.keys(exported), ['version', 'players', 'matches']);
  assert.equal(exported.version, TOURNAMENT_VERSION);
  assert.deepEqual(exported.matches[0]?.turns, [{ moves: 8, elapsedMs: 1500 }]);
  assert.deepEqual(Object.keys(exported.matches[0] ?? {}), ['boardCode', 'turns']);
});

test('limits at their edges are accepted', () => {
  const edge = saved({
    matches: [
      match(boardCode(4, 1), [
        { moves: 8, elapsedMs: 0 },
        { moves: MOVES_MAX, elapsedMs: ELAPSED_MAX_MS },
      ]),
      match(boardCode(4, 2)),
      match(boardCode(4, 3)),
    ],
  });
  assert.ok(readTournament(edge));
});

const IDLE_MATCHES = [match(boardCode(4, 1)), match(boardCode(4, 2)), match(boardCode(4, 3))];
const FINISHED_TURN = { moves: 8, elapsedMs: 10 };
const INVALID: readonly [string, Record<string, unknown>][] = [
  ['another version', { version: TOURNAMENT_VERSION + 1 }],
  ['an extra field', { extra: true }],
  ['three players', { players: ['Ann', 'Ben', 'Cy'], matches: IDLE_MATCHES.slice(0, 2) }],
  ['players that are not a list', { players: 'Ann Ben Cy Dee' }],
  ['a blank name', { players: ['Ann', '', 'Cy', 'Dee'] }],
  ['a name that is not text', { players: ['Ann', 2, 'Cy', 'Dee'] }],
  ['a name with extra spaces', { players: ['Ann ', 'Ben', 'Cy', 'Dee'] }],
  ['names that repeat', { players: ['Ann', 'Ben', 'cy', 'CY'] }],
  ['too few matches', { matches: IDLE_MATCHES.slice(0, 2) }],
  ['matches that are not a list', { matches: {} }],
  ['an invalid board code', { matches: [match('np1-4-0'), ...IDLE_MATCHES.slice(1)] }],
  ['a board code that is not text', { matches: [match(4), ...IDLE_MATCHES.slice(1)] }],
  [
    'deals on different grids',
    { matches: [IDLE_MATCHES[0], match(boardCode(6, 1)), IDLE_MATCHES[2]] },
  ],
  [
    'a match with an extra field',
    { matches: [{ ...IDLE_MATCHES[0], extra: 1 }, ...IDLE_MATCHES.slice(1)] },
  ],
  [
    'three results in a match',
    {
      matches: [
        match(boardCode(4, 1), [FINISHED_TURN, FINISHED_TURN, FINISHED_TURN]),
        ...IDLE_MATCHES.slice(1),
      ],
    },
  ],
  [
    'fewer moves than pairs',
    { matches: [match(boardCode(4, 1), [{ moves: 7, elapsedMs: 0 }]), ...IDLE_MATCHES.slice(1)] },
  ],
  [
    'more moves than the cap',
    {
      matches: [
        match(boardCode(4, 1), [{ moves: MOVES_MAX + 1, elapsedMs: 0 }]),
        ...IDLE_MATCHES.slice(1),
      ],
    },
  ],
  [
    'a fractional move count',
    { matches: [match(boardCode(4, 1), [{ moves: 8.5, elapsedMs: 0 }]), ...IDLE_MATCHES.slice(1)] },
  ],
  [
    'negative time',
    { matches: [match(boardCode(4, 1), [{ moves: 8, elapsedMs: -1 }]), ...IDLE_MATCHES.slice(1)] },
  ],
  [
    'time past the cap',
    {
      matches: [
        match(boardCode(4, 1), [{ moves: 8, elapsedMs: ELAPSED_MAX_MS + 1 }]),
        ...IDLE_MATCHES.slice(1),
      ],
    },
  ],
  [
    'a result with an extra field',
    {
      matches: [match(boardCode(4, 1), [{ ...FINISHED_TURN, extra: 1 }]), ...IDLE_MATCHES.slice(1)],
    },
  ],
  [
    'results after a match that is still waiting',
    {
      matches: [
        match(boardCode(4, 1), [FINISHED_TURN]),
        match(boardCode(4, 2), [FINISHED_TURN]),
        IDLE_MATCHES[2],
      ],
    },
  ],
];
for (const [name, overrides] of INVALID)
  test(`a tournament with ${name} is rejected`, () => {
    assert.equal(readTournament(saved(overrides)), null);
    assert.equal(decodeTournament(JSON.stringify(saved(overrides))), null);
  });

test('text that is not a tournament is rejected', () => {
  for (const text of ['', '{', 'null', '[]', '"Ann"', '{}', '7'])
    assert.equal(decodeTournament(text), null);
  const padded = JSON.stringify(saved()) + ' '.repeat(TOURNAMENT_MAX_BYTES);
  assert.equal(decodeTournament(padded), null);
  assert.ok(decodeTournament(JSON.stringify(saved()) + ' '));
});
