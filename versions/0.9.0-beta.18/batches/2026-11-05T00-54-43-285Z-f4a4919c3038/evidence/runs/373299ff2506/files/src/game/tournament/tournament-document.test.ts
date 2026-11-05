import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame } from '../game.ts';
import { isJsonObject } from '../saved-format.ts';
import {
  decodeTournamentDocument,
  encodeTournamentDocument,
  TOURNAMENT_JSON_MAX,
} from './tournament-document.ts';
import { readTournament, serializedTournament } from './tournament-format.ts';
import { completeSampleTurn, sampleDocument, sampleTournament } from './tournament.fixture.ts';
import { advanceTournament, startTournamentTurn } from './tournament.ts';

test('setup, active progress, handoffs and completed brackets round trip as versioned JSON', () => {
  const ready = sampleTournament();
  const playing = startTournamentTurn(ready);
  assert.ok(playing.game);
  const pending = {
    ...playing,
    game: advanceGame(activateCard(activateCard(playing.game, 0), 1), 200),
  };
  let finished = ready;
  for (let turn = 0; turn < 6; turn++) finished = completeSampleTurn(finished);
  const states = [
    null,
    ready,
    playing,
    pending,
    completeSampleTurn(ready),
    advanceTournament(completeSampleTurn(ready)),
    completeSampleTurn(completeSampleTurn(ready)),
    finished,
  ];
  for (const tournament of states) {
    const document = { ...sampleDocument(tournament), pastTournaments: [finished] };
    assert.deepEqual(decodeTournamentDocument(encodeTournamentDocument(document)), document);
  }
});

test('invalid imports reject impossible stages, incomplete results and a game from another match', () => {
  const baseline = serializedTournament(sampleTournament());
  const invalid = [
    { players: ['A', 'B'] },
    { players: ['A', 'B', ' ', 'D'] },
    { players: ['A', 'B', 'C', 'D'.repeat(61)] },
    { boardCodes: ['np1-4-1'] },
    { boardCodes: ['np1-4-1', 'np1-6-1', 'np1-4-3'] },
    { boardCodes: ['broken', 'np1-4-2', 'np1-4-3'] },
    { stage: 'complete' },
    { stage: 'turn-complete' },
    { stage: 'match-complete' },
    { stage: 'playing' },
    { stage: 'other' },
    { results: [{ moves: 7, elapsedMs: 0 }] },
    { results: [{ moves: 8, elapsedMs: -1 }] },
    { results: [{ moves: 8.5, elapsedMs: 1000 }] },
    { results: [{ moves: 8, elapsedMs: 0, extra: true }] },
    { results: Array.from({ length: 7 }, () => ({ moves: 8, elapsedMs: 0 })) },
    { extra: true },
  ];
  for (const overrides of invalid)
    assert.equal(readTournament({ ...baseline, ...overrides }), null);
  const playing = startTournamentTurn(sampleTournament());
  assert.ok(playing.game);
  assert.equal(
    readTournament(
      serializedTournament({ ...playing, boardCodes: ['np1-4-2', 'np1-4-3', 'np1-4-4'] }),
    ),
    null,
  );
  const completed = completeSampleTurn(playing);
  assert.equal(readTournament(serializedTournament({ ...completed, game: playing.game })), null);
});

test('document validation rejects malformed, oversized and incompatible data before changing state', () => {
  const document = sampleDocument(sampleTournament());
  const valid: unknown = JSON.parse(encodeTournamentDocument(document));
  assert.ok(isJsonObject(valid));
  const invalid = ['{', 'null', '[]', '{}'];
  for (const text of invalid) {
    assert.equal(decodeTournamentDocument(text), null);
  }
  for (const overrides of [
    { version: 2 },
    { tournament: {} },
    { setup: { ...document.setup, playerCount: 6 } },
    { setup: { ...document.setup, names: [] } },
    { setup: { ...document.setup, size: 5 } },
    { pastTournaments: [serializedTournament(sampleTournament())] },
    { extra: true },
  ])
    assert.equal(decodeTournamentDocument(JSON.stringify({ ...valid, ...overrides })), null);
  const text = encodeTournamentDocument(document);
  const nested = '{"nested":'.repeat(10_000) + 'null' + '}'.repeat(10_000);
  const deepGame = text.replace('"game": null', `"game": ${nested}`);
  assert.equal(decodeTournamentDocument(deepGame), null);
  const padded = text + ' '.repeat(TOURNAMENT_JSON_MAX - Buffer.byteLength(text));
  assert.ok(decodeTournamentDocument(padded));
  assert.equal(decodeTournamentDocument(padded + ' '), null);
});
