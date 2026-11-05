import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame, ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../game.fixture.ts';
import { createTournament, NAME_MAX_CHARACTERS, recordTurn } from './bracket.ts';
import {
  decodeTournament,
  encodeTournament,
  readSavedTournament,
  TOURNAMENT_MAX_BYTES,
  TOURNAMENT_VERSION,
  TournamentStage,
} from './tournament-format.ts';
import type { SavedTournament } from './tournament-format.ts';

const PLAYERS = ['Ann', 'Ben', 'Cy', 'Di'];
const STARTED = createTournament(PLAYERS, [EXAMPLE_CODE, 'np1-6-2', EXAMPLE_CODE]);
const FIRST_TURN = recordTurn(STARTED, { moves: 9, elapsedMs: 4200 });
const FINISHED = [
  { moves: 8, elapsedMs: 3000 },
  { moves: 20, elapsedMs: 9000 },
  { moves: 18, elapsedMs: 7000 },
  { moves: 8, elapsedMs: 2000 },
  { moves: 9, elapsedMs: 2500 },
].reduce(recordTurn, FIRST_TURN);
const EIGHT = createTournament(
  [...PLAYERS, 'Ed', 'Flo', 'Gus', 'Hal'],
  Array.from({ length: 7 }, (_, index) => `np1-4-${index + 1}`),
);
const IN_PROGRESS = activateCard(activateCard(activateCard(createGame(EXAMPLE_CODE), 2), 6), 0);
const WON = EXAMPLE_PAIRS.flat().reduce(activateCard, createGame(EXAMPLE_CODE));

function saved(overrides: Partial<SavedTournament>): SavedTournament {
  return { ...FIRST_TURN, stage: TournamentStage.ready, game: null, ...overrides };
}

function encodedWith(change: (value: Record<string, unknown>) => void): string {
  const value: Record<string, unknown> = JSON.parse(encodeTournament(saved({})));
  change(value);
  return JSON.stringify(value);
}

test('every stage round trips through its JSON text', () => {
  const stages = [
    { players: ['Ann', ' ', '', 'Di'], matches: [], stage: TournamentStage.setup, game: null },
    saved({}),
    saved({ players: PLAYERS, matches: STARTED.matches }),
    saved(EIGHT),
    saved({ stage: TournamentStage.playing, game: IN_PROGRESS }),
    saved({ stage: TournamentStage.ended }),
    saved({ ...FINISHED, stage: TournamentStage.ended }),
  ];
  for (const stage of stages) assert.deepEqual(decodeTournament(encodeTournament(stage)), stage);
  const text = encodeTournament(saved({ stage: TournamentStage.playing, game: IN_PROGRESS }));
  assert.equal(JSON.parse(text).version, TOURNAMENT_VERSION);
  assert.deepEqual(JSON.parse(text).game.matched, [2, 6]);
});

test('malformed, oversized and unknown tournament text is rejected', () => {
  assert.deepEqual(decodeTournament(encodedWith(() => undefined)), saved({}));
  assert.equal(decodeTournament('{'), null);
  assert.equal(decodeTournament('null'), null);
  assert.equal(decodeTournament(' '.repeat(TOURNAMENT_MAX_BYTES + 1)), null);
  assert.equal(readSavedTournament([]), null);
  assert.equal(decodeTournament(encodedWith((value) => (value.version = 2))), null);
  assert.equal(decodeTournament(encodedWith((value) => (value.extra = true))), null);
  assert.equal(decodeTournament(encodedWith((value) => (value.stage = 'paused'))), null);
});

const INVALID_ROSTERS = [
  ['Ann', 'Ben', 'Cy'],
  ['Ann', 'Ben', 'Cy', 'Di', 'Ed'],
  ['Ann', 'Ben', 'Cy', 'ANN'],
  ['Ann', 'Ben', 'Cy', ''],
  ['Ann', 'Ben', 'Cy', ' Di'],
  ['Ann', 'Ben', 'Cy', 'D'.repeat(NAME_MAX_CHARACTERS + 1)],
  ['Ann', 'Ben', 'Cy', 4],
];
for (const [index, players] of INVALID_ROSTERS.entries())
  test(`a started tournament rejects invalid roster ${index + 1}`, () => {
    assert.equal(decodeTournament(encodedWith((value) => (value.players = players))), null);
  });

const INVALID_MATCHES: readonly unknown[] = [
  [],
  [{ boardCode: EXAMPLE_CODE, results: [null, null] }],
  [...STARTED.matches.slice(0, 2), { boardCode: 'np1-5-1', results: [null, null] }],
  [...STARTED.matches.slice(0, 2), { boardCode: EXAMPLE_CODE, results: [null] }],
  [...STARTED.matches.slice(0, 2), { boardCode: EXAMPLE_CODE, results: [null, null], x: 1 }],
  [
    { boardCode: EXAMPLE_CODE, results: [null, { moves: 8, elapsedMs: 1 }] },
    ...STARTED.matches.slice(1),
  ],
  [
    { boardCode: EXAMPLE_CODE, results: [{ moves: 7, elapsedMs: 1 }, null] },
    ...STARTED.matches.slice(1),
  ],
  [
    { boardCode: EXAMPLE_CODE, results: [{ moves: MOVES_MAX + 1, elapsedMs: 1 }, null] },
    ...STARTED.matches.slice(1),
  ],
  [
    { boardCode: EXAMPLE_CODE, results: [{ moves: 8, elapsedMs: ELAPSED_MAX_MS + 1 }, null] },
    ...STARTED.matches.slice(1),
  ],
  [
    { boardCode: EXAMPLE_CODE, results: [{ moves: 8, elapsedMs: 0.5 }, null] },
    ...STARTED.matches.slice(1),
  ],
  [
    STARTED.matches[0],
    { boardCode: 'np1-6-2', results: [{ moves: 18, elapsedMs: 1 }, null] },
    STARTED.matches[2],
  ],
];
for (const [index, matches] of INVALID_MATCHES.entries())
  test(`a started tournament rejects invalid matches ${index + 1}`, () => {
    assert.equal(decodeTournament(encodedWith((value) => (value.matches = matches))), null);
  });

test('each stage needs the progress it describes', () => {
  const invalid: SavedTournament[] = [
    saved({ stage: TournamentStage.ready, game: IN_PROGRESS }),
    saved({ stage: TournamentStage.ended, game: IN_PROGRESS }),
    saved({ ...STARTED, stage: TournamentStage.ended }),
    saved({ ...FINISHED, stage: TournamentStage.ready }),
    saved({ stage: TournamentStage.playing, game: WON }),
    saved({ stage: TournamentStage.playing, game: createGame('np1-4-2') }),
    saved({ ...FINISHED, stage: TournamentStage.playing, game: IN_PROGRESS }),
    saved({ stage: TournamentStage.setup }),
    saved({ players: ['Ann', 'Ben', 'Cy'], matches: [], stage: TournamentStage.setup }),
    saved({ matches: [], stage: TournamentStage.setup, game: IN_PROGRESS }),
  ];
  for (const value of invalid) assert.equal(decodeTournament(encodeTournament(value)), null);
  assert.equal(
    decodeTournament(encodedWith((value) => ((value.stage = 'playing'), (value.game = {})))),
    null,
  );
});
