import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from '../game.ts';
import { decodeTournament, encodeTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import { createTournament, recordTournamentResult, TournamentPhase } from './rules.ts';
import type { TournamentDocument } from './format.ts';

const setup = { count: 4, names: ['Ada', 'Bo', 'Cora', 'Dev', '', '', '', ''] };
const event = createTournament(setup.names.slice(0, 4), ['np1-6-1', 'np1-6-2', 'np1-8-1']);
const ready: TournamentDocument = {
  setup,
  run: {
    event,
    matchIndex: 0,
    phase: TournamentPhase.ready,
    game: null,
  },
};

test('imported participant names normalize before length and duplicate validation', () => {
  const base = { format: 'neon-pairs/tournament', version: 1, setup, run: ready.run };
  const withNames = (players: readonly string[]) =>
    JSON.stringify({ ...base, run: { ...ready.run, event: { ...event, players } } });
  assert.deepEqual(decodeTournament(withNames(['  Ada  ', 'Bo', 'Cora', 'Dev'])), ready);
  assert.equal(decodeTournament(withNames(['A', 'Bo', 'Cora', 'Dev'])), 'Use 2 to 20 characters.');
  assert.equal(
    decodeTournament(withNames(['Ada', 'Bo', 'Cora', ' ADA '])),
    'Each name must be different.',
  );
});

test('setup and all handoff and completion screens round trip as versioned alphabetical JSON', () => {
  const documents: TournamentDocument[] = [{ setup, run: null }, ready];
  let record = event;
  for (let index = 0; index < 3; index += 1) {
    for (let turn = 0; turn < 2; turn += 1) {
      record = recordTournamentResult(record, index, {
        moves: index === 2 ? 32 : 18,
        elapsedMs: 1000.25,
      });
      documents.push({
        setup,
        run: {
          event: record,
          matchIndex: index,
          game: null,
          phase:
            turn === 0
              ? TournamentPhase.turnResult
              : index === 2
                ? TournamentPhase.complete
                : TournamentPhase.matchResult,
        },
      });
    }
  }
  for (const document of documents) {
    const text = encodeTournament(document);
    assert.deepEqual(decodeTournament(text), document);
    assert.match(text, /"format": "neon-pairs\/tournament"/);
    assert.match(text, /"version": 1/);
    const checkOrder = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if (!Array.isArray(value)) assert.deepEqual(Object.keys(value), Object.keys(value).sort());
      for (const child of Object.values(value)) checkOrder(child);
    };
    const parsed: unknown = JSON.parse(text);
    checkOrder(parsed);
  }
});

test('an active export restores progress behind Start turn including a pending mismatch', () => {
  let game = createGame('np1-6-1');
  const other = game.deck.findIndex((face) => face !== game.deck[0]);
  game = activateCard(activateCard(game, 0), other);
  game = advanceGame(game, 250);
  const active: TournamentDocument = {
    setup,
    run: { event, matchIndex: 0, phase: TournamentPhase.playing, game },
  };
  assert.deepEqual(decodeTournament(encodeTournament(active)), {
    setup,
    run: { ...active.run, phase: TournamentPhase.ready },
  });
});

test('unknown root, match, result and nested game fields report their first name', () => {
  const base = { format: 'neon-pairs/tournament', version: 1, setup, run: ready.run };
  const cases = [
    { ...base, surprise: true },
    {
      ...base,
      run: {
        ...ready.run,
        event: {
          ...event,
          matches: [{ ...event.matches[0], surprise: 1 }, ...event.matches.slice(1)],
        },
      },
    },
    {
      ...base,
      run: {
        ...ready.run,
        event: {
          ...event,
          matches: [
            { ...event.matches[0], results: [{ elapsedMs: 0, moves: 18, surprise: true }] },
            ...event.matches.slice(1),
          ],
        },
      },
    },
    {
      ...base,
      run: {
        ...ready.run,
        phase: 'playing',
        game: {
          version: 1,
          boardCode: 'np1-6-1',
          matched: [],
          selection: { kind: 'closed', surprise: true },
          moves: 0,
          elapsedMs: 0,
          started: false,
        },
      },
    },
  ];
  for (const value of cases)
    assert.equal(decodeTournament(JSON.stringify(value)), 'Unknown field: surprise.');
});

test('malformed, oversized, unsupported and inconsistent imports are rejected', () => {
  const base = { format: 'neon-pairs/tournament', version: 1, setup, run: ready.run };
  for (const text of [
    '{',
    'null',
    '[]',
    ' '.repeat(TOURNAMENT_MAX_BYTES + 1),
    JSON.stringify({ ...base, version: 2 }),
    JSON.stringify({ ...base, format: 'neon-pairs/snapshot' }),
    JSON.stringify({ ...base, run: { ...ready.run, matchIndex: 1 } }),
    JSON.stringify({ ...base, run: { ...ready.run, phase: 'complete' } }),
    JSON.stringify({ ...base, run: { ...ready.run, phase: 'playing' } }),
    JSON.stringify({
      ...base,
      run: { ...ready.run, event: { ...event, players: ['Ada', 'Bo', 'ADA', 'Dev'] } },
    }),
  ])
    assert.equal(typeof decodeTournament(text), 'string');
  for (const result of [
    { moves: 17, elapsedMs: 0 },
    { moves: 18.5, elapsedMs: 0 },
    { moves: 18, elapsedMs: -1 },
    { moves: 18, elapsedMs: 360000000 },
  ]) {
    assert.equal(
      typeof decodeTournament(
        JSON.stringify({
          ...base,
          run: {
            ...ready.run,
            event: {
              ...event,
              matches: [{ ...event.matches[0], results: [result] }, ...event.matches.slice(1)],
            },
          },
        }),
      ),
      'string',
    );
  }
});
