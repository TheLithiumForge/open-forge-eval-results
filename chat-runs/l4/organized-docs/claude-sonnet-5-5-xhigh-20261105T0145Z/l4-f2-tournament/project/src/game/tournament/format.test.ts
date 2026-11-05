import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeTournament, encodeTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import { createTournament, recordResult } from './rules.ts';
import type { Tournament } from './rules.ts';

const PLAYERS = ['Ada', 'Bo', 'Cora', 'Dev'];
const CODES = ['np1-6-3', 'np1-6-4', 'np1-8-5'];

function document(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: 'neon-pairs/tournament',
    matches: [
      { boardCode: 'np1-6-3', results: [{ elapsedMs: 40_000, moves: 20 }] },
      { boardCode: 'np1-6-4', results: [] },
      { boardCode: 'np1-8-5', results: [] },
    ],
    players: PLAYERS,
    version: 1,
    ...overrides,
  };
}

function decode(value: unknown) {
  return decodeTournament(JSON.stringify(value));
}

function rejected(value: unknown): string | null {
  const decoded = decode(value);
  return decoded.ok ? null : decoded.notice;
}

function keysAreSorted(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(keysAreSorted);
  if (typeof value !== 'object' || value === null) return true;
  const keys = Object.keys(value);
  return keys.join() === [...keys].sort().join() && Object.values(value).every(keysAreSorted);
}

test('an exported tournament names its format and version and keeps keys in alphabetical order', () => {
  let tournament = createTournament(PLAYERS, CODES);
  tournament = recordResult(tournament, { moves: 20, elapsedMs: 40_000 });
  const text = encodeTournament(tournament);
  const value: unknown = JSON.parse(text);
  assert.ok(keysAreSorted(value));
  assert.deepEqual(value, document());
  assert.match(text, /^\{\n {2}"format": "neon-pairs\/tournament",\n {2}"matches": \[/);
});

test('a draft, a tournament in progress and a finished tournament all round trip', () => {
  const draft: Tournament = { players: ['Ada', '', 'C', 'Dev'], matches: [] };
  let played = createTournament(PLAYERS, CODES);
  const forms = [draft, played];
  for (const [moves, elapsedMs] of [
    [20, 9],
    [21, 8],
    [20, 9],
    [22, 8],
    [33, 9],
    [34, 7],
  ] as const) {
    played = recordResult(played, { moves, elapsedMs });
    forms.push(played);
  }
  for (const tournament of forms) {
    const decoded = decodeTournament(encodeTournament(tournament));
    assert.deepEqual(decoded, { ok: true, tournament });
  }
});

test('a field the format does not define is named and wins over other problems', () => {
  assert.equal(rejected(document({ extra: 1 })), 'Unknown field: extra.');
  assert.equal(rejected(document({ extra: 1, version: 2 })), 'Unknown field: extra.');
  const nested = document({
    matches: [
      { boardCode: 'np1-6-3', results: [{ elapsedMs: 1, moves: 20, note: 'x' }], hint: 'y' },
    ],
  });
  assert.equal(rejected(nested), 'Unknown field: hint.');
  const inResult = document({
    matches: [{ boardCode: 'np1-6-3', results: [{ elapsedMs: 40_000, moves: 20, note: 'x' }] }],
  });
  assert.equal(rejected(inResult), 'Unknown field: note.');
  assert.equal(rejected({ ...document(), zeta: 1, alpha: 2 }), 'Unknown field: zeta.');
});

test('input that is not a complete version 1 tournament is invalid', () => {
  assert.equal(decodeTournament('{').ok, false);
  assert.equal(decodeTournament('[]').ok, false);
  assert.equal(decodeTournament('null').ok, false);
  const cases: unknown[] = [
    document({ format: 'neon-pairs/snapshot' }),
    document({ version: '1' }),
    document({ version: 2 }),
    document({ players: ['Ada', 'Bo', 'Cora'] }),
    document({ players: ['Ada', 'Bo', 'Cora', 'dev', 'ADA', 'x', 'y', 'z'] }),
    document({ players: ['Ada', 'Bo', 'Cora', 'ada'] }),
    document({ players: ['Ada', 'Bo', 'Cora', ' Dev'] }),
    document({ players: ['Ada', 'Bo', 'Cora', 'D'] }),
    document({ players: ['Ada', 'Bo', 'Cora', 4] }),
  ];
  for (const value of cases) assert.equal(rejected(value), 'Invalid tournament.');
  const { matches, ...withoutMatches } = document();
  assert.ok(Array.isArray(matches));
  assert.equal(rejected(withoutMatches), 'Invalid tournament.');
});

test('matches need the right board size, distinct codes and results in play order', () => {
  const match = (boardCode: string, count: number) => ({
    boardCode,
    results: Array.from({ length: count }, () => ({ elapsedMs: 1000, moves: 40 })),
  });
  const cases: unknown[] = [
    document({ matches: [match('np1-4-3', 0), match('np1-6-4', 0), match('np1-8-5', 0)] }),
    document({ matches: [match('np1-6-3', 0), match('np1-6-3', 0), match('np1-8-5', 0)] }),
    document({ matches: [match('np1-6-3', 0), match('np1-6-4', 0)] }),
    document({ matches: [match('np1-6-3', 3), match('np1-6-4', 0), match('np1-8-5', 0)] }),
    document({ matches: [match('np1-6-3', 1), match('np1-6-4', 1), match('np1-8-5', 0)] }),
    document({ matches: [match('np1-6-3', 0), match('np1-6-4', 0), match('np1-8-5', 1)] }),
    document({ matches: [match('np1-6-3', 0), match('np1-6-4', 0), match('np1-8-05', 0)] }),
  ];
  for (const value of cases) assert.equal(rejected(value), 'Invalid tournament.');
  assert.equal(
    decode(document({ matches: [match('np1-6-3', 2), match('np1-6-4', 1), match('np1-8-5', 0)] }))
      .ok,
    true,
  );
});

test('results stay within what a completed game can record', () => {
  const withResult = (result: unknown) =>
    document({
      matches: [
        { boardCode: 'np1-6-3', results: [result] },
        { boardCode: 'np1-6-4', results: [] },
        { boardCode: 'np1-8-5', results: [] },
      ],
    });
  assert.equal(decode(withResult({ elapsedMs: 0, moves: 18 })).ok, true);
  assert.equal(decode(withResult({ elapsedMs: 359_999_999, moves: 999_999 })).ok, true);
  for (const result of [
    { elapsedMs: 0, moves: 17 },
    { elapsedMs: 0, moves: 1_000_000 },
    { elapsedMs: 360_000_000, moves: 20 },
    { elapsedMs: -1, moves: 20 },
    { elapsedMs: 1.5, moves: 20 },
    { elapsedMs: '5', moves: 20 },
    { elapsedMs: 5 },
    {},
  ])
    assert.equal(rejected(withResult(result)), 'Invalid tournament.');
});

test('text past the byte limit is invalid', () => {
  const padded = `${JSON.stringify(document())}${' '.repeat(TOURNAMENT_MAX_BYTES)}`;
  assert.equal(decodeTournament(padded).ok, false);
});
