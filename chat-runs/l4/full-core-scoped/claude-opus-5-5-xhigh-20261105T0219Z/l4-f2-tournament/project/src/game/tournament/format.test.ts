import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  decodeTournament,
  encodeTournament,
  readTournament,
  TOURNAMENT_FORMAT,
  TOURNAMENT_VERSION,
} from './format.ts';
import { createTournament, recordResult } from './rules.ts';
import { isJsonObject } from '../saved-format.ts';

const CODES = ['np1-6-1', 'np1-6-2', 'np1-8-1'];
const STARTED = recordResult(
  createTournament(['Ada', 'Bo', 'Cora', 'Dev'], () => CODES.shift() ?? 'np1-8-2'),
  { moves: 20, elapsedMs: 45_000.625 },
);

function exported(change: (value: Record<string, unknown>) => void = () => {}): string {
  const value: unknown = JSON.parse(encodeTournament(STARTED));
  assert.ok(isJsonObject(value));
  const copy = { ...value };
  change(copy);
  return JSON.stringify(copy);
}

function keyOrders(value: unknown): string[][] {
  if (Array.isArray(value)) return value.flatMap(keyOrders);
  if (!value || typeof value !== 'object') return [];
  return [Object.keys(value), ...Object.values(value).flatMap(keyOrders)];
}

test('export names its format and version with alphabetical keys at every level', () => {
  const text = encodeTournament(STARTED);
  const value: unknown = JSON.parse(text);
  assert.ok(text.includes('\n  "format"') && isJsonObject(value));
  assert.deepEqual(Object.keys(value), ['format', 'matches', 'players', 'version']);
  for (const keys of keyOrders(value)) assert.deepEqual(keys, [...keys].sort());
  assert.equal(TOURNAMENT_FORMAT, 'neon-pairs/tournament');
  assert.equal(TOURNAMENT_VERSION, 1);
  assert.deepEqual(decodeTournament(text), { tournament: STARTED });
});

test('the first field a tournament format does not define is named, in text order', () => {
  const nested = exported((value) => {
    value.matches = [
      { boardCode: 'np1-6-1', results: [{ elapsedMs: 1, moves: 20, note: 'x' }], extra: 1 },
    ];
    value.later = true;
  });
  assert.deepEqual(decodeTournament(nested), { unknownField: 'note' });
  assert.deepEqual(decodeTournament(exported((value) => (value.comment = 'hi'))), {
    unknownField: 'comment',
  });
  const wrongFormat = exported((value) => {
    value.format = 'neon-pairs/snapshot';
    value.comment = 'hi';
  });
  assert.equal(decodeTournament(wrongFormat), null);
});

test('incomplete, inconsistent or out-of-range tournaments are rejected', () => {
  const cases: ((value: Record<string, unknown>) => void)[] = [
    (value) => delete value.players,
    (value) => (value.version = 2),
    (value) => (value.players = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi']),
    (value) => (value.players = ['Ada', 'Bo', 'Cora', 'ada']),
    (value) => (value.players = ['Ada', 'Bo', 'Cora', 'D']),
    (value) => (value.matches = [{ boardCode: 'np1-6-1', results: [] }]),
    (value) =>
      (value.matches = [
        { boardCode: 'np1-4-1', results: [] },
        { boardCode: 'np1-6-2', results: [] },
        { boardCode: 'np1-8-1', results: [] },
      ]),
    (value) =>
      (value.matches = [
        { boardCode: 'np1-6-1', results: [] },
        { boardCode: 'np1-6-1', results: [] },
        { boardCode: 'np1-8-1', results: [] },
      ]),
    (value) =>
      (value.matches = [
        { boardCode: 'np1-6-1', results: [{ elapsedMs: 1, moves: 20 }] },
        { boardCode: 'np1-6-2', results: [{ elapsedMs: 1, moves: 20 }] },
        { boardCode: 'np1-8-1', results: [] },
      ]),
    (value) =>
      (value.matches = [
        { boardCode: 'np1-6-1', results: [{ elapsedMs: 1, moves: 17 }] },
        { boardCode: 'np1-6-2', results: [] },
        { boardCode: 'np1-8-1', results: [] },
      ]),
    (value) =>
      (value.matches = [
        { boardCode: 'np1-6-1', results: [{ elapsedMs: -1, moves: 20 }] },
        { boardCode: 'np1-6-2', results: [] },
        { boardCode: 'np1-8-1', results: [] },
      ]),
    (value) =>
      (value.matches = [
        { boardCode: 'np1-6-1', results: [{ moves: 20 }] },
        { boardCode: 'np1-6-2', results: [] },
        { boardCode: 'np1-8-1', results: [] },
      ]),
  ];
  assert.ok(decodeTournament(exported()));
  for (const [index, change] of cases.entries())
    assert.equal(decodeTournament(exported(change)), null, `case ${index}`);
  for (const text of ['{', 'null', '[]', '"tournament"', ' '.repeat(65_537)])
    assert.equal(decodeTournament(text), null, text.slice(0, 12));
});

test('loaded names take the accepted form and stored records carry no format fields', () => {
  const spaced = exported((value) => (value.players = ['  Ada ', 'Bo', 'Cora', 'Dev']));
  const decoded = decodeTournament(spaced);
  assert.ok(decoded && 'tournament' in decoded);
  assert.equal(decoded.tournament.players[0], 'Ada');
  const value: unknown = JSON.parse(exported());
  assert.ok(isJsonObject(value));
  assert.deepEqual(readTournament({ matches: value.matches, players: value.players }), STARTED);
  assert.equal(readTournament(value), null);
});
