import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  appendRecord,
  readRecords,
  RECORDS_BLOCKED,
  RECORDS_MAX,
  RECORDS_VERSION,
  saveRecords,
  TOURNAMENTS_KEY,
} from './records.ts';
import { championOf } from './rules.ts';
import { fourPlayers, turn } from './tournament.fixture.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './types.ts';

const FINISHED = fourPlayers([turn(20), turn(22), turn(21), turn(19), turn(40), turn(41)]);

function memoryStore(entries = new Map<string, string>()) {
  const writes: string[] = [];
  const store: PreferenceStore = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(key);
      entries.set(key, value);
    },
  };
  return { store, entries, writes };
}

const DENIED: PreferenceStore = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
};

function distinct(count: number): Tournament[] {
  return Array.from({ length: count }, (_, index) => ({
    ...FINISHED,
    players: ['Ada', 'Bo', 'Cora', `Dev ${index}`],
  }));
}

test('records are stored under their own key as an object with exactly v and items', () => {
  const { store, entries } = memoryStore();
  assert.equal(TOURNAMENTS_KEY, 'np3:tournaments');
  assert.equal(saveRecords(store, [FINISHED]).blocked, false);
  const stored: unknown = JSON.parse(entries.get('np3:tournaments') ?? '');
  assert.ok(typeof stored === 'object' && stored !== null);
  assert.deepEqual(Object.keys(stored).sort(), ['items', 'v']);
  assert.equal(RECORDS_VERSION, 3);
  assert.deepEqual(stored, {
    items: [{ matches: FINISHED.matches, players: FINISHED.players }],
    v: 3,
  });
});

test('finished tournaments come back after a reload in the order they were saved', () => {
  const { store } = memoryStore();
  const [first, second] = distinct(2);
  assert.ok(first && second);
  saveRecords(store, [first, second]);
  assert.deepEqual(readRecords(store), { items: [first, second], blocked: false });
  assert.equal(FINISHED.players[championOf(FINISHED) ?? -1], 'Ada');
});

test('a saved list keeps its newest ten and drops the oldest', () => {
  const all = distinct(RECORDS_MAX + 2);
  const kept = all.reduce<Tournament[]>((items, tournament) => appendRecord(items, tournament), []);
  assert.equal(kept.length, 10);
  assert.deepEqual(kept, all.slice(2));
  const { store } = memoryStore();
  saveRecords(store, kept);
  assert.equal(readRecords(store).items.length, 10);
});

test('nothing stored reads as an empty list without a warning', () => {
  assert.deepEqual(readRecords(memoryStore().store), { items: [], blocked: false });
});

test('a value that cannot be read is empty and stays until the next save', () => {
  const unreadable = [
    '{',
    'null',
    '[]',
    JSON.stringify({ v: 3 }),
    JSON.stringify({ v: 2, items: [] }),
    JSON.stringify({ v: 3, items: [], extra: 1 }),
    JSON.stringify({ v: 3, items: [{ players: [], matches: [] }] }),
    JSON.stringify({ v: 3, items: [{ players: FINISHED.players, matches: [] }] }),
  ];
  for (const text of unreadable) {
    const { store, writes } = memoryStore(new Map([[TOURNAMENTS_KEY, text]]));
    assert.deepEqual(readRecords(store), { items: [], blocked: false }, text);
    assert.deepEqual(writes, []);
  }
});

test('one rejected record empties the whole list', () => {
  const good = { matches: FINISHED.matches, players: FINISHED.players };
  const text = JSON.stringify({ items: [good, { ...good, players: ['x'] }], v: 3 });
  const { store } = memoryStore(new Map([[TOURNAMENTS_KEY, text]]));
  assert.deepEqual(readRecords(store).items, []);
});

test('unavailable storage keeps the list in memory and says it will not be saved', () => {
  assert.deepEqual(readRecords(null), { items: [], blocked: true });
  assert.deepEqual(readRecords(DENIED), { items: [], blocked: true });
  assert.deepEqual(saveRecords(null, [FINISHED]), { items: [FINISHED], blocked: true });
  assert.deepEqual(saveRecords(DENIED, [FINISHED]), { items: [FINISHED], blocked: true });
  assert.equal(RECORDS_BLOCKED, "Progress won't be saved on this device.");
});

test('saving leaves other keys alone', () => {
  const { store, entries } = memoryStore(new Map([['other', 'kept']]));
  saveRecords(store, [FINISHED]);
  assert.equal(entries.get('other'), 'kept');
});
