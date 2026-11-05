import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import {
  decodeTournament,
  encodeTournament,
  TOURNAMENT_FORMAT,
  TOURNAMENT_MAX_BYTES,
  TOURNAMENT_VERSION,
  TournamentNotice,
} from './exchange.ts';
import { createTournament, recordResult } from './rules.ts';

let seed = 0;
const started = recordResult(
  createTournament(['Ada', 'Bo', 'Cora', 'Dev'], (size) => boardCode(size, (seed += 1))),
  { elapsedMs: 70200.375, moves: 21 },
);
const [FIRST, SECOND, FINAL] = [
  { boardCode: 'np1-6-1', results: [{ elapsedMs: 70200.375, moves: 21 }, null] },
  { boardCode: 'np1-6-2', results: [null, null] },
  { boardCode: 'np1-8-3', results: [null, null] },
];
const BASE = {
  format: TOURNAMENT_FORMAT,
  matches: [FIRST, SECOND, FINAL],
  players: ['Ada', 'Bo', 'Cora', 'Dev'],
  version: TOURNAMENT_VERSION,
};

function keyOrders(value: unknown): string[][] {
  if (Array.isArray(value)) return value.flatMap(keyOrders);
  if (typeof value !== 'object' || value === null) return [];
  return [Object.keys(value), ...Object.values(value).flatMap(keyOrders)];
}

function decoded(value: unknown) {
  return decodeTournament(JSON.stringify(value));
}

test('export names its format and version and sorts keys at every level', () => {
  const exported: unknown = JSON.parse(encodeTournament(started));
  assert.deepEqual(exported, BASE);
  for (const keys of keyOrders(exported)) assert.deepEqual(keys, [...keys].sort());
});

test('a loaded export compares with the same exact results', () => {
  assert.deepEqual(decodeTournament(encodeTournament(started)), { tournament: started });
});

test('the first field a format does not define is named, wherever it is', () => {
  assert.deepEqual(decoded({ ...BASE, extra: 1 }), { problem: 'Unknown field: extra.' });
  const noted = { ...SECOND, results: [{ elapsedMs: 1, moves: 18, note: 'x' }, null] };
  assert.deepEqual(decoded({ ...BASE, matches: [{ ...FIRST, seat: 1 }, noted, FINAL], zzz: 1 }), {
    problem: 'Unknown field: seat.',
  });
  assert.deepEqual(decoded({ ...BASE, matches: [FIRST, noted, FINAL], zzz: 1 }), {
    problem: 'Unknown field: note.',
  });
  assert.deepEqual(decoded({ ...BASE, version: 2, zzz: 1 }), { problem: 'Unknown field: zzz.' });
});

test('malformed, incomplete or inconsistent tournaments are invalid', () => {
  const unplayed = { ...FIRST, results: [{ moves: 21 }, null] };
  const cases = [
    '{',
    'null',
    '[]',
    JSON.stringify({ ...BASE, version: 2 }),
    JSON.stringify({ ...BASE, version: '1' }),
    JSON.stringify({ ...BASE, format: 'neon-pairs/snapshot' }),
    JSON.stringify({ format: TOURNAMENT_FORMAT, matches: BASE.matches, version: 1 }),
    JSON.stringify({ ...BASE, players: ['Ada', 'Bo', 'Cora'] }),
    JSON.stringify({ ...BASE, matches: [FIRST, FIRST, FINAL] }),
    JSON.stringify({ ...BASE, matches: [{ ...FIRST, results: [null] }, SECOND, FINAL] }),
    JSON.stringify({ ...BASE, matches: [unplayed, SECOND, FINAL] }),
    `${JSON.stringify(BASE)}${' '.repeat(TOURNAMENT_MAX_BYTES)}`,
  ];
  for (const text of cases)
    assert.deepEqual(decodeTournament(text), { problem: TournamentNotice.invalid }, text);
});
