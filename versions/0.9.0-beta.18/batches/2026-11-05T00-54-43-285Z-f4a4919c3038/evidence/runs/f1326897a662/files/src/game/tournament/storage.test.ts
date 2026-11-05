import assert from 'node:assert/strict';
import { test } from 'vitest';
import { readTournaments, saveTournament, TOURNAMENTS_KEY } from './storage.ts';
import { completedTournament } from './tournament.fixture.ts';

test('history uses the exact feature envelope and retains the newest ten tournaments', () => {
  const values = new Map<string, string>([['unrelated', 'untouched']]);
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  let history = readTournaments(store);
  for (let index = 0; index < 12; index += 1)
    history = saveTournament(store, history.items, completedTournament(4, index * 10));
  assert.equal(history.items.length, 10);
  assert.equal(history.items[0]?.matches[0]?.boardCode, 'np1-6-211');
  assert.equal(history.items[9]?.matches[0]?.boardCode, 'np1-6-121');
  const stored: unknown = JSON.parse(values.get(TOURNAMENTS_KEY) ?? 'null');
  assert.deepEqual(stored, { v: 3, items: history.items });
  assert.deepEqual(readTournaments(store), history);
  assert.equal(values.get('unrelated'), 'untouched');
  assert.equal(
    saveTournament(store, history.items, history.items[0] ?? completedTournament()).items.length,
    10,
  );
});

test('corrupt records stay untouched until saving and blocked stores keep results in memory', () => {
  let text = '{';
  const store = {
    getItem: () => text,
    setItem: (_key: string, value: string) => {
      text = value;
    },
  };
  assert.deepEqual(readTournaments(store), { items: [], blocked: false });
  assert.equal(text, '{');
  const completed = completedTournament();
  saveTournament(store, [], completed);
  assert.deepEqual(readTournaments(store).items, [completed]);
  const denied = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
  assert.equal(readTournaments(denied).blocked, true);
  assert.equal(readTournaments(null).blocked, true);
  assert.deepEqual(saveTournament(denied, [], completed), { items: [completed], blocked: true });
  assert.deepEqual(saveTournament(null, [], completed), { items: [completed], blocked: true });
});
