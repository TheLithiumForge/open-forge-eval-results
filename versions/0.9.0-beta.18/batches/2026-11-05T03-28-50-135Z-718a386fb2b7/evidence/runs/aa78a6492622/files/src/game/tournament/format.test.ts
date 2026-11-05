import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame } from '../game.ts';
import { boardCode } from '../deck.ts';
import {
  decodeTournamentFile,
  decodeTournamentHistory,
  encodeTournamentFile,
  encodeTournamentHistory,
  TOURNAMENT_FILE_FORMAT,
  TOURNAMENT_FILE_VERSION,
  TOURNAMENT_HISTORY_VERSION,
} from './format.ts';
import { beginTurn, createTournament } from './rules.ts';
import { unknownTournamentField } from './unknown-field.ts';
import type { Entrant } from './rules.ts';
import { isJsonObject } from '../saved-format.ts';

const PLAYERS: Entrant[] = ['Ada', 'Bo', 'Cora', 'Dev'].map((name, index) => ({
  seed: index + 1,
  name,
}));
const CODES = [boardCode(6, 1), boardCode(6, 2), boardCode(8, 3)];

test('setup drafts round trip without treating incomplete input as accepted names', () => {
  const draft = { playerCount: 4 as const, names: ['Ada', '', 'Cora', 'Dev', '', '', '', ''] };
  const encoded = encodeTournamentFile(null, draft);
  const value = JSON.parse(encoded);
  assert.deepEqual(Object.keys(value), ['data', 'format', 'version']);
  assert.equal(value.format, TOURNAMENT_FILE_FORMAT);
  assert.equal(value.version, TOURNAMENT_FILE_VERSION);
  assert.deepEqual(Object.keys(value.data), ['kind', 'names', 'playerCount']);
  const loaded = decodeTournamentFile(encoded);
  assert.deepEqual(loaded, { kind: 'setup', draft });
});

test('active tournaments round trip the board and fractional active time', () => {
  let tournament = createTournament(PLAYERS, CODES, '2026-11-05T11:00:00.000Z');
  tournament = beginTurn(tournament);
  const first = activateCard(tournament.currentGame!, 0);
  tournament = { ...tournament, currentGame: advanceGame(first, 12.5) };
  const loaded = decodeTournamentFile(
    encodeTournamentFile(tournament, { playerCount: 4, names: [] }),
  );
  assert.equal(loaded?.kind, 'event');
  if (loaded?.kind !== 'event') throw new Error('Expected an active event.');
  assert.equal(loaded.tournament.currentGame?.boardCode, CODES[0]);
  assert.equal(loaded.tournament.currentGame?.elapsedMs, 12.5);
  assert.deepEqual(loaded.tournament.currentGame?.selection, { kind: 'one', index: 0 });
});

test('imports reject unknown fields and repeated match deal codes', () => {
  const event = beginTurn(createTournament(PLAYERS, CODES, '2026-11-05T11:00:00.000Z'));
  const baseValue: unknown = JSON.parse(encodeTournamentFile(event, { playerCount: 4, names: [] }));
  if (!isJsonObject(baseValue) || !isJsonObject(baseValue.data))
    throw new Error('Expected a tournament export.');
  const base = baseValue;
  const withExtra = structuredClone(base);
  if (!isJsonObject(withExtra.data)) throw new Error('Expected tournament data.');
  withExtra.data.extra = true;
  assert.equal(decodeTournamentFile(JSON.stringify(withExtra)), null);
  assert.equal(unknownTournamentField(JSON.stringify(withExtra)), 'extra');
  const withRepeatedCode = structuredClone(base);
  if (!isJsonObject(withRepeatedCode) || !isJsonObject(withRepeatedCode.data))
    throw new Error('Expected a tournament export.');
  const matches = withRepeatedCode.data.matches;
  if (!Array.isArray(matches) || !isJsonObject(matches[0]) || !isJsonObject(matches[1]))
    throw new Error('Expected tournament matches.');
  matches[1].boardCode = matches[0].boardCode;
  assert.equal(decodeTournamentFile(JSON.stringify(withRepeatedCode)), null);
});

test('tournament history uses a bounded versioned envelope', () => {
  const encoded = encodeTournamentHistory([]);
  assert.deepEqual(JSON.parse(encoded), { items: [], v: 3 });
  assert.equal(TOURNAMENT_HISTORY_VERSION, 3);
  assert.deepEqual(decodeTournamentHistory(encoded), []);
  assert.equal(decodeTournamentHistory('{'), null);
  assert.equal(
    decodeTournamentHistory(JSON.stringify({ schemaVersion: 1, tournaments: [null] })),
    null,
  );
});
