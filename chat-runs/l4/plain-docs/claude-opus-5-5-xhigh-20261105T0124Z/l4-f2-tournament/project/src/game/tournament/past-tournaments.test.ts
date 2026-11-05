import assert from 'node:assert/strict';
import { test } from 'vitest';
import { addRecord, PAST_LIMIT, readPast, TOURNAMENTS_KEY } from './past-tournaments.ts';
import { recordAttempt } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

function finished(champion: string): Tournament {
  const start: Tournament = {
    players: [champion, 'Bo', 'Cora', 'Dev'],
    matches: ['np1-6-1', 'np1-6-2', 'np1-8-1'].map((boardCode) => ({ boardCode, attempts: [] })),
  };
  return [18, 19, 18, 19, 32, 33].reduce(
    (tournament, moves) => recordAttempt(tournament, { moves, elapsedMs: 1500.5 }),
    start,
  );
}

function memoryStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: string[] = [];
  const store: PreferenceStore = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(key);
      values.set(key, value);
    },
  };
  return { store, values, writes };
}

const denied: PreferenceStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

test('saved tournaments use the namespaced key and a two-key envelope, newest first', () => {
  const { store, values } = memoryStore({ 'other-app': 'kept' });
  assert.deepEqual(readPast(store), { records: [], saving: true });
  const first = addRecord(store, [], finished('Ada'));
  const second = addRecord(store, first.records, finished('Abe'));
  assert.deepEqual(
    second.records.map((record) => record.players[0]),
    ['Abe', 'Ada'],
  );
  const saved: unknown = JSON.parse(values.get(TOURNAMENTS_KEY) ?? '');
  assert.ok(saved && typeof saved === 'object');
  assert.deepEqual(Object.keys(saved), ['v', 'items']);
  assert.equal(TOURNAMENTS_KEY, 'np3:tournaments');
  assert.deepEqual(readPast(store), second);
  assert.equal(values.get('other-app'), 'kept');
});

test('a save keeps the newest ten records and drops older ones', () => {
  const { store } = memoryStore();
  let records: readonly Tournament[] = [];
  const names = Array.from({ length: PAST_LIMIT + 2 }, (_, index) => `Player ${index}`);
  for (const name of names) records = addRecord(store, records, finished(name)).records;
  const kept = readPast(store).records.map((record) => record.players[0]);
  assert.equal(PAST_LIMIT, 10);
  assert.deepEqual(kept, names.slice(2).reverse());
});

test('an unusable stored value reads as empty without being rewritten', () => {
  const record = finished('Ada');
  const partial = {
    ...record,
    matches: record.matches.map((match, index) =>
      index === 2 ? { ...match, attempts: [] } : match,
    ),
  };
  for (const text of [
    '{',
    'null',
    '[]',
    '{"v":3}',
    '{"v":2,"items":[]}',
    '{"v":3,"items":[],"extra":1}',
    JSON.stringify({ v: 3, items: [partial] }),
    JSON.stringify({ v: 3, items: [{ ...record, version: 1 }] }),
  ]) {
    const { store, values, writes } = memoryStore({ [TOURNAMENTS_KEY]: text });
    assert.deepEqual(readPast(store), { records: [], saving: true }, text);
    assert.equal(values.get(TOURNAMENTS_KEY), text);
    assert.deepEqual(writes, []);
  }
});

test('blocked storage keeps finished tournaments in memory and reports that it cannot save', () => {
  assert.deepEqual(readPast(null), { records: [], saving: false });
  assert.deepEqual(readPast(denied), { records: [], saving: false });
  const kept = addRecord(denied, [], finished('Ada'));
  assert.equal(kept.saving, false);
  assert.equal(kept.records.length, 1);
  assert.equal(addRecord(null, kept.records, finished('Abe')).records.length, 2);
});
