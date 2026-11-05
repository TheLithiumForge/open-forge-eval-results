import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  decodeRecords,
  encodeRecords,
  keepRecord,
  RECORDS_KEPT,
  TOURNAMENTS_KEY,
} from './records.ts';
import type { Tournament } from './rules.ts';

function finished(champion: string): Tournament {
  const result = (moves: number) => ({ moves, elapsedMs: 1000 });
  return {
    players: [champion, 'Bo', 'Cora', 'Dev'],
    matches: [
      { boardCode: 'np1-6-1', results: [result(18), result(19)] },
      { boardCode: 'np1-6-2', results: [result(18), result(19)] },
      { boardCode: 'np1-8-1', results: [result(32), result(33)] },
    ],
    reviewing: false,
  };
}

test('records are stored under the feature namespace in a two-key envelope', () => {
  assert.equal(TOURNAMENTS_KEY, 'np3:tournaments');
  const stored: unknown = JSON.parse(encodeRecords([finished('Ada')]));
  assert.ok(stored && typeof stored === 'object');
  assert.deepEqual(Object.keys(stored), ['v', 'items']);
  assert.deepEqual(decodeRecords(encodeRecords([finished('Ada')])), [finished('Ada')]);
});

test('saving keeps the newest 10 records, newest first', () => {
  let records: readonly Tournament[] = [];
  for (let index = 0; index < 12; index += 1) records = keepRecord(records, finished(`P${index}x`));
  assert.equal(records.length, RECORDS_KEPT);
  assert.equal(records[0]?.players[0], 'P11x');
  assert.equal(records.at(-1)?.players[0], 'P2x');
  assert.deepEqual(decodeRecords(encodeRecords(records)), records);
});

test('stored values that fail to parse or validate read as no records', () => {
  const valid = JSON.parse(encodeRecords([finished('Ada')]));
  for (const text of [
    null,
    '',
    '{',
    'null',
    '[]',
    JSON.stringify({ ...valid, v: 2 }),
    JSON.stringify({ ...valid, extra: 1 }),
    JSON.stringify({ v: 3, items: {} }),
    JSON.stringify({ v: 3, items: [{ ...valid.items[0], reviewing: false }] }),
    encodeRecords([{ ...finished('Ada'), matches: finished('Ada').matches.slice(0, 2) }]),
    encodeRecords([finished('Ada'), { ...finished('Ada'), players: ['Ada', 'ada', 'C1', 'D1'] }]),
  ])
    assert.deepEqual(decodeRecords(text), [], String(text));
});

test('an unfinished tournament is not a record', () => {
  const unfinished = finished('Ada');
  const matches: Tournament['matches'] = [
    ...unfinished.matches.slice(0, 2),
    { boardCode: 'np1-8-1', results: [null, null] },
  ];
  assert.deepEqual(decodeRecords(encodeRecords([{ ...unfinished, matches }])), []);
});
