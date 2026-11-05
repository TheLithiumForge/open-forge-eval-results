import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  DecodeKind,
  decodeTournament,
  encodeDraft,
  encodeTournament,
  ExchangeError,
  TOURNAMENT_FORMAT,
  TOURNAMENT_MAX_BYTES,
  TOURNAMENT_VERSION,
  unknownField,
} from './exchange.ts';
import { FOUR, FOUR_CODES, fourPlayers, turn } from './tournament.fixture.ts';
import type { Tournament } from './types.ts';

const FINISHED = fourPlayers([
  turn(20, 61_500),
  turn(22, 59_000),
  turn(21, 70_200),
  turn(19, 65_900),
  turn(40, 120_000),
  turn(41, 100_000),
]);

function document(tournament: Tournament): Record<string, unknown> {
  const value: unknown = JSON.parse(encodeTournament(tournament));
  assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value));
  return { ...value };
}

// Every object in the document lists its keys in alphabetical order.
function isSorted(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(isSorted);
  if (typeof value !== 'object' || value === null) return true;
  const keys = Object.keys(value);
  return keys.join() === [...keys].sort().join() && Object.values(value).every(isSorted);
}

function decodedError(value: unknown): string | undefined {
  const decoded = decodeTournament(JSON.stringify(value));
  return decoded.kind === DecodeKind.error ? decoded.message : undefined;
}

test('an exported tournament names its format and writes keys alphabetically at every level', () => {
  const value = document(FINISHED);
  assert.equal(value.format, 'neon-pairs/tournament');
  assert.equal(value.format, TOURNAMENT_FORMAT);
  assert.equal(value.version, TOURNAMENT_VERSION);
  assert.ok(Number.isInteger(value.version));
  assert.deepEqual(Object.keys(value), ['format', 'matches', 'players', 'version']);
  assert.ok(isSorted(value));
  assert.ok(isSorted(JSON.parse(encodeDraft(FOUR))));
  assert.match(encodeTournament(FINISHED), /\n {2}"format"/);
});

test('a finished tournament survives export and load unchanged', () => {
  assert.deepEqual(decodeTournament(encodeTournament(FINISHED)), {
    kind: DecodeKind.tournament,
    tournament: FINISHED,
  });
});

test('a tournament part way through keeps its results and its place', () => {
  const partial = fourPlayers([turn(20), turn(22), turn(21)]);
  assert.deepEqual(decodeTournament(encodeTournament(partial)), {
    kind: DecodeKind.tournament,
    tournament: partial,
  });
});

test('a tournament that has not started exports its entry list as a draft', () => {
  const value = document(fourPlayers());
  assert.deepEqual(
    value.matches,
    FOUR_CODES.map((boardCode) => ({ boardCode, results: [] })),
  );
  const draft = JSON.parse(encodeDraft(['  Ada ', 'Bo', '', 'Dev']));
  assert.deepEqual(draft.matches, []);
  assert.deepEqual(draft.players, ['Ada', 'Bo', '', 'Dev']);
  assert.deepEqual(decodeTournament(encodeDraft(['  Ada ', 'Bo', '', 'Dev'])), {
    kind: DecodeKind.draft,
    players: ['Ada', 'Bo', '', 'Dev'],
  });
});

test('the first field the format does not define is named', () => {
  const root = document(FINISHED);
  assert.equal(decodedError({ ...root, note: 1, extra: 2 }), 'Unknown field: note.');
  assert.equal(unknownField('note'), 'Unknown field: note.');
  const matches = [
    { boardCode: 'np1-6-21', results: [], color: 'red' },
    ...FINISHED.matches.slice(1),
  ];
  assert.equal(decodedError({ ...root, matches }), 'Unknown field: color.');
  const results = [{ moves: 20, elapsedMs: 1, place: 1 }];
  const nested = [{ boardCode: 'np1-6-21', results }, ...FINISHED.matches.slice(1)];
  assert.equal(decodedError({ ...root, matches: nested }), 'Unknown field: place.');
});

test('text that is not a version 1 tournament is invalid', () => {
  const root = document(FINISHED);
  const invalid = [
    undefined,
    { ...root, version: 2 },
    { ...root, version: '1' },
    { ...root, format: 'neon-pairs/snapshot' },
    { format: root.format, matches: root.matches, version: 1 },
    { ...root, players: ['Ada', 'Bo', 'Cora'] },
    { ...root, players: ['Ada', 'Bo', 'Cora', 'ada'] },
    { ...root, players: ['Ada', 'B', 'Cora', 'Dev'] },
    { ...root, players: [' Ada', 'Bo', 'Cora', 'Dev'] },
    { ...root, matches: FINISHED.matches.slice(1) },
  ];
  for (const value of invalid) {
    const decoded = decodeTournament(value === undefined ? '{' : JSON.stringify(value));
    assert.deepEqual(decoded, { kind: DecodeKind.error, message: ExchangeError.invalid });
  }
  for (const text of ['', 'null', '[]', '"x"']) assert.equal(decodeTournament(text).kind, 'error');
  assert.equal(ExchangeError.invalid, 'Invalid tournament.');
});

test('matches must use their round size, a different code and plausible results', () => {
  const root = document(FINISHED);
  const [first, second, third] = FINISHED.matches;
  assert.ok(first && second && third);
  const bad = [
    [{ ...first, boardCode: 'np1-4-1' }, second, third],
    [first, { ...second, boardCode: first.boardCode }, third],
    [first, second, { ...third, boardCode: 'np1-6-9' }],
    [{ ...first, boardCode: 'np1-6-021' }, second, third],
    [{ ...first, results: [turn(17), turn(20)] }, second, third],
    [{ ...first, results: [{ moves: 20, elapsedMs: -1 }, turn(20)] }, second, third],
    [{ ...first, results: [{ moves: 20.5, elapsedMs: 1 }, turn(20)] }, second, third],
    [{ ...first, results: [turn(20), turn(21), turn(22)] }, second, third],
    [{ ...first, results: [turn(20)] }, second, third],
  ];
  for (const matches of bad)
    assert.equal(decodedError({ ...root, matches }), 'Invalid tournament.');
});

test('text over the byte limit is invalid even when it is valid JSON', () => {
  const padded = `${encodeTournament(FINISHED)}${' '.repeat(TOURNAMENT_MAX_BYTES)}`;
  assert.deepEqual(decodeTournament(padded), {
    kind: DecodeKind.error,
    message: 'Invalid tournament.',
  });
});
