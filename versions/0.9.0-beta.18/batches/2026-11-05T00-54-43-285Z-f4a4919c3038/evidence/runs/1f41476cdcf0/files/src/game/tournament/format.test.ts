import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from '../game.ts';
import { decodeTournament, encodeTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import { createTournament } from './rules.ts';
import { TournamentPhase } from './types.ts';
import { readPastTournaments, savePastTournament, TOURNAMENTS_KEY } from './storage.ts';
import type { TournamentDocument } from './format.ts';

const document: TournamentDocument = {
  setup: { count: 4, names: ['Ada', 'Bo', 'Cora', 'Dev', '', '', '', ''] },
  tournament: createTournament(['Ada', 'Bo', 'Cora', 'Dev'], ['np1-6-1', 'np1-6-2', 'np1-8-3']),
  game: null,
};

test('setup, ready handoff and an active mismatch round trip through alphabetically ordered JSON', () => {
  for (const value of [document, { ...document, tournament: null }]) {
    const text = encodeTournament(value);
    assert.deepEqual(decodeTournament(text), value);
    JSON.parse(text, (_key, value: unknown) => {
      if (value && typeof value === 'object' && !Array.isArray(value))
        assert.deepEqual(Object.keys(value), Object.keys(value).sort());
      return value;
    });
  }
  assert.ok(document.tournament);
  let game = activateCard(createGame('np1-6-1'), 0);
  const other = game.deck.findIndex((face) => face !== game.deck[0]);
  game = advanceGame(activateCard(game, other), 100);
  const playing = {
    ...document,
    tournament: { ...document.tournament, phase: TournamentPhase.playing },
    game,
  };
  assert.deepEqual(decodeTournament(encodeTournament(playing)), playing);
});

test('unknown fields identify their name and inconsistent or oversized imports are rejected', () => {
  assert.ok(document.tournament);
  const root: unknown = JSON.parse(encodeTournament(document));
  assert.equal(
    decodeTournament(JSON.stringify({ format: 'neon-pairs/tournament', extra: true })),
    'Unknown field: extra.',
  );
  assert.equal(
    decodeTournament(
      JSON.stringify({
        ...document,
        format: 'neon-pairs/tournament',
        version: 1,
        snapshot: null,
        game: undefined,
        tournament: { ...document.tournament, extra: 1 },
      }),
    ),
    'Unknown field: extra.',
  );
  assert.equal(decodeTournament('{'), 'Invalid tournament.');
  assert.equal(decodeTournament(' '.repeat(TOURNAMENT_MAX_BYTES + 1)), 'Invalid tournament.');
  assert.ok(root);
  for (const tournament of [
    { ...document.tournament, phase: TournamentPhase.complete },
    { ...document.tournament, matchIndex: 1 },
    { ...document.tournament, turn: 1 },
    { ...document.tournament, players: ['Ada', 'ada', 'Cora', 'Dev'] },
    {
      ...document.tournament,
      matches: document.tournament.matches.map(() => ({ boardCode: 'np1-6-1', results: [] })),
    },
  ])
    assert.equal(
      decodeTournament(encodeTournament({ ...document, tournament })),
      'Invalid tournament.',
    );
});

test('history keeps ten newest completed records in the exact storage envelope and tolerates failures', () => {
  assert.ok(document.tournament);
  const completed = {
    ...document.tournament,
    phase: TournamentPhase.complete,
    matchIndex: 2,
    turn: 1,
    matches: document.tournament.matches.map((match, index) => ({
      ...match,
      results: [
        { moves: index === 2 ? 32 : 18, elapsedMs: 1.25 },
        { moves: index === 2 ? 32 : 18, elapsedMs: 2.5 },
      ],
    })),
  };
  const values = new Map<string, string>([['unrelated', 'keep']]);
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  let history = readPastTournaments(store);
  for (let index = 0; index < 12; index++)
    history = savePastTournament(store, history.items, {
      ...completed,
      players: [`Ada ${index}`, 'Bo', 'Cora', 'Dev'],
    });
  assert.equal(history.items.length, 10);
  assert.equal(history.items[0]?.players[0], 'Ada 11');
  assert.deepEqual(readPastTournaments(store), history);
  assert.equal(values.get('unrelated'), 'keep');
  assert.deepEqual(Object.keys(JSON.parse(values.get(TOURNAMENTS_KEY) ?? '{}')).sort(), [
    'items',
    'v',
  ]);
  values.set(TOURNAMENTS_KEY, '{');
  assert.deepEqual(readPastTournaments(store), { items: [], blocked: false });
  assert.equal(values.get(TOURNAMENTS_KEY), '{');
  const denied = {
    getItem(): never {
      throw new Error('denied');
    },
    setItem(): never {
      throw new Error('denied');
    },
  };
  assert.equal(readPastTournaments(denied).blocked, true);
  assert.equal(savePastTournament(denied, [], completed).items.length, 1);
  assert.equal(savePastTournament(null, [], completed).blocked, true);
});
