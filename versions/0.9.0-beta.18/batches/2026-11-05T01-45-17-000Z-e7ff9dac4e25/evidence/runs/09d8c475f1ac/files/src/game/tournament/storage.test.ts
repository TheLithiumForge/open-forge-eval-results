import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { toRecord } from './format.ts';
import { createTournament, dealSizes, nextTurn, recordResult } from './rules.ts';
import {
  readTournaments,
  TOURNAMENTS_KEPT,
  TOURNAMENTS_KEY,
  TOURNAMENTS_VERSION,
  withNewest,
  saveTournaments,
} from './storage.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

function finished(champion: string, offset = 0): Tournament {
  const codes = dealSizes(4).map((size, index) => boardCode(size, offset * 10 + index + 1));
  let tournament = createTournament([champion, 'Bo', 'Cora', 'Dev'], codes);
  for (let turn = nextTurn(tournament); turn; turn = nextTurn(tournament))
    tournament = recordResult(tournament, turn, { moves: 40 + turn.slot, elapsedMs: 9000 });
  return tournament;
}

function memory(initial?: string): PreferenceStore & { values: Map<string, string> } {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(TOURNAMENTS_KEY, initial);
  values.set('other.key', 'kept');
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  };
}

const DENIED: PreferenceStore = {
  getItem() {
    throw new Error('denied');
  },
  setItem() {
    throw new Error('denied');
  },
};

test('saved tournaments are a two key envelope that reads back newest first', () => {
  const store = memory();
  const records = [finished('Ada', 2), finished('Eve', 1)];
  assert.deepEqual(saveTournaments(store, records), { records, blocked: false });
  const raw = JSON.parse(store.values.get(TOURNAMENTS_KEY) ?? 'null');
  assert.deepEqual(Object.keys(raw).sort(), ['items', 'v']);
  assert.equal(raw.v, 3);
  assert.equal(TOURNAMENTS_VERSION, 3);
  assert.deepEqual(raw.items, records.map(toRecord));
  assert.deepEqual(readTournaments(store), { records, blocked: false });
  assert.equal(store.values.get('other.key'), 'kept');
});

test('only the newest ten tournaments are kept when another is saved', () => {
  let records: Tournament[] = [];
  for (let index = 0; index < 12; index += 1) records = withNewest(records, finished('Ada', index));
  assert.equal(records.length, TOURNAMENTS_KEPT);
  assert.deepEqual(records[0], finished('Ada', 11));
  assert.deepEqual(records.at(-1), finished('Ada', 2));
});

test('a missing, malformed or wrongly shaped value reads as empty without a notice', () => {
  const good = JSON.stringify({ items: [toRecord(finished('Ada'))], v: 3 });
  const unfinished = createTournament(
    ['Ada', 'Bo', 'Cora', 'Dev'],
    dealSizes(4).map((size, index) => boardCode(size, index + 1)),
  );
  const bad = [
    '',
    '{',
    'null',
    '[]',
    JSON.stringify({ items: [], v: 2 }),
    JSON.stringify({ items: [] }),
    JSON.stringify({ items: [], v: 3, extra: 1 }),
    JSON.stringify({ items: {}, v: 3 }),
    JSON.stringify({ items: [{ matches: [], players: [] }], v: 3 }),
    JSON.stringify({ items: [toRecord(unfinished)], v: 3 }),
    JSON.stringify({ items: [toRecord(finished('Ada')), 5], v: 3 }),
    JSON.stringify({ items: Array.from({ length: 11 }, () => toRecord(finished('Ada'))), v: 3 }),
  ];
  assert.equal(readTournaments(memory(good)).records.length, 1);
  for (const text of bad) {
    const read = readTournaments(memory(text));
    assert.deepEqual(read, { records: [], blocked: false }, text);
  }
  assert.deepEqual(readTournaments(memory()), { records: [], blocked: false });
});

test('reading does not change the stored value', () => {
  const store = memory('{');
  readTournaments(store);
  assert.equal(store.values.get(TOURNAMENTS_KEY), '{');
});

test('an unavailable store is reported and writing never throws', () => {
  assert.deepEqual(readTournaments(null), { records: [], blocked: true });
  assert.deepEqual(readTournaments(DENIED), { records: [], blocked: true });
  const records = [finished('Ada')];
  assert.deepEqual(saveTournaments(null, records), { records, blocked: true });
  assert.deepEqual(saveTournaments(DENIED, records), { records, blocked: true });
});
