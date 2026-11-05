import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { beginTurn } from './rules.ts';
import { decodeTournament, encodeTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import { completedTournament, tournamentFixture } from './tournament.fixture.ts';
import { readTournament } from './validation.ts';
import type { TournamentSetup } from './format.ts';

const SETUP: TournamentSetup = { count: 4, names: ['Ada', 'Bo', 'Cora', 'Dev', '', '', '', ''] };

test('setup, complete brackets and active progress round trip through versioned JSON', () => {
  const empty = decodeTournament(encodeTournament(SETUP, null, null));
  assert.deepEqual(empty, { setup: SETUP, tournament: null, game: null });
  const tournament = completedTournament();
  assert.deepEqual(decodeTournament(encodeTournament(SETUP, tournament, null)), {
    setup: SETUP,
    tournament,
    game: null,
  });
  const active = beginTurn(tournamentFixture());
  const game = activateCard(createGame('np1-6-101'), 3);
  const restored = decodeTournament(encodeTournament(SETUP, active, encodeSnapshot(game)));
  assert.equal(typeof restored, 'object');
  if (typeof restored !== 'string') assert.deepEqual(restored.game, game);
  const encoded = encodeTournament(SETUP, tournament, null);
  assert.ok(encoded.indexOf('"format"') < encoded.indexOf('"setup"'));
  assert.ok(encoded.indexOf('"elapsedMs"') < encoded.indexOf('"moves"'));
  assert.match(encoded, /"format": "neon-pairs\/tournament"/);
});

test('unknown fields are identified at the envelope, setup, match and result boundaries', () => {
  const tournament = completedTournament();
  const document = {
    format: 'neon-pairs/tournament',
    version: 1,
    setup: SETUP,
    tournament,
    snapshot: null,
  };
  for (const value of [
    { ...document, surprise: 1 },
    { ...document, setup: { ...SETUP, surprise: 1 } },
    { ...document, tournament: { ...tournament, surprise: 1 } },
    {
      ...document,
      tournament: { ...tournament, matches: [{ ...tournament.matches[0], surprise: 1 }] },
    },
    {
      ...document,
      tournament: {
        ...tournament,
        matches: [{ boardCode: 'np1-6-101', results: [{ moves: 18, elapsedMs: 0, surprise: 1 }] }],
      },
    },
  ])
    assert.equal(decodeTournament(JSON.stringify(value)), 'Unknown field: surprise.');
  assert.equal(decodeTournament(JSON.stringify({ ...document, '': true })), 'Unknown field: .');
});

test('imports reject invalid topology, phases, sizes, duplicate deals and implausible results', () => {
  const tournament = completedTournament();
  const first = tournament.matches[0];
  assert.ok(first);
  for (const value of [
    { ...tournament, players: ['Ada', 'ada', 'Cora', 'Dev'] },
    { ...tournament, currentMatch: 3 },
    { ...tournament, phase: 'ready' },
    { ...tournament, matches: tournament.matches.slice(1) },
    { ...tournament, matches: [first, first, tournament.matches[2]] },
    {
      ...tournament,
      matches: [{ ...first, boardCode: 'np1-4-101' }, ...tournament.matches.slice(1)],
    },
    ...[-1, 17, 18.5, 1_000_000].map((moves) => ({
      ...tournament,
      matches: [
        { ...first, results: [{ moves, elapsedMs: 0 }, first.results[1]] },
        ...tournament.matches.slice(1),
      ],
    })),
  ])
    assert.equal(readTournament(value), null);
  const active = beginTurn(tournamentFixture());
  assert.equal(decodeTournament(encodeTournament(SETUP, active, null)), 'Invalid tournament.');
  assert.equal(decodeTournament('{'), 'Invalid tournament.');
  assert.equal(decodeTournament(' '.repeat(TOURNAMENT_MAX_BYTES + 1)), 'Invalid tournament.');
});
