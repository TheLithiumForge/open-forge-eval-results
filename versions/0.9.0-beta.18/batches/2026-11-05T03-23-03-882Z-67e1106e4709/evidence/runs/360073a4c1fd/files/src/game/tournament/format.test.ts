import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { decodeTournament, encodeTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import { createTournament, TournamentPhase } from './rules.ts';

const players = ['Ada', 'Bo', 'Cora', 'Dev'];
const ready = createTournament(players, ['np1-6-1', 'np1-6-2', 'np1-8-1']);

test('setup, handoffs, completed results and a partial turn round trip through versioned JSON', () => {
  const setup = decodeTournament(encodeTournament(null, ['', ' A ', 'Cafe\u0301', 'Dev'], null));
  assert.deepEqual(setup.data?.players, ['', ' A ', 'Cafe\u0301', 'Dev']);
  assert.equal(setup.data?.tournament, null);
  assert.deepEqual(decodeTournament(encodeTournament(ready, [], null)).data?.tournament, ready);
  const playing = { ...ready, phase: TournamentPhase.playing };
  const game = activateCard(createGame('np1-6-1'), 0);
  const encoded = encodeTournament(playing, [], game);
  assert.equal(
    encodeSnapshot(decodeTournament(encoded).data?.game ?? createGame('np1-4-1')),
    encodeSnapshot(game),
  );
  const value: unknown = JSON.parse(encoded);
  assert.ok(value && typeof value === 'object');
  assert.deepEqual(Object.keys(value), [...Object.keys(value)].sort());
});

test('invalid imports reject unknown fields, impossible results and broken bracket progression', () => {
  const base = { format: 'neon-pairs/tournament', ...ready, snapshot: null, version: 1 };
  assert.equal(
    decodeTournament(JSON.stringify({ ...base, surprise: true })).error,
    'Unknown field: surprise.',
  );
  assert.equal(
    decodeTournament(
      JSON.stringify({
        ...base,
        matches: [{ boardCode: 'np1-6-1', results: [], extra: 1 }, ...ready.matches.slice(1)],
      }),
    ).error,
    'Unknown field: extra.',
  );
  for (const changes of [
    { version: 2 },
    { players: ['Ada', 'ADA', 'Cora', 'Dev'] },
    { players: [' Ada', 'Bo', 'Cora', 'Dev'] },
    { matchIndex: 1 },
    { phase: 'complete' },
    { phase: 'playing' },
    { snapshot: '{}' },
    { matches: [ready.matches[0], ready.matches[0], ready.matches[2]] },
    { matches: [{ boardCode: 'np1-4-1', results: [] }, ...ready.matches.slice(1)] },
    {
      matches: [
        { boardCode: 'np1-6-1', results: [{ moves: 17, elapsedMs: 0 }] },
        ...ready.matches.slice(1),
      ],
    },
    {
      matches: [
        { boardCode: 'np1-6-1', results: [{ moves: 18, elapsedMs: -1 }] },
        ...ready.matches.slice(1),
      ],
    },
  ])
    assert.equal(decodeTournament(JSON.stringify({ ...base, ...changes })).data, null);
  for (const text of ['{', 'null', '[]', ' '.repeat(TOURNAMENT_MAX_BYTES + 1)])
    assert.equal(decodeTournament(text).data, null);
});

test('partial turn imports validate their snapshot and report unknown nested fields', () => {
  const game = createGame('np1-6-1');
  const base = {
    format: 'neon-pairs/tournament',
    ...ready,
    phase: 'playing',
    snapshot: encodeSnapshot(game),
    version: 1,
  };
  assert.ok(decodeTournament(JSON.stringify(base)).data);
  const wrong = { ...base, snapshot: encodeSnapshot(createGame('np1-6-2')) };
  assert.equal(decodeTournament(JSON.stringify(wrong)).data, null);
  const snapshot = {
    version: 1,
    boardCode: game.boardCode,
    matched: [],
    selection: { kind: 'closed', extra: true },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
  assert.equal(
    decodeTournament(JSON.stringify({ ...base, snapshot: JSON.stringify(snapshot) })).error,
    'Unknown field: extra.',
  );
});
