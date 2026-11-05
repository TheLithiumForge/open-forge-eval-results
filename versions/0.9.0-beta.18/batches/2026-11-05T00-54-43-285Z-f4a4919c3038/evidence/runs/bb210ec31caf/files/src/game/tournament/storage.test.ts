import assert from 'node:assert/strict';
import { test } from 'vitest';
import { readTournamentHistory, saveTournamentHistory, TOURNAMENTS_KEY } from './storage.ts';
import { completedTournament } from './tournament.fixture.ts';
import type { TournamentArchive } from './format.ts';

test('saved history retains the newest ten completed tournaments in the feature envelope', () => {
  const values = new Map([['other-key', 'untouched']]);
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  let items: readonly TournamentArchive[] = [];
  const records = Array.from({ length: 11 }, (_, index) => completedTournament(index + 1));
  for (const record of records) items = saveTournamentHistory(store, items, record).items;
  assert.deepEqual(items, records.slice(1).reverse());
  assert.deepEqual(readTournamentHistory(store).items, items);
  const value: unknown = JSON.parse(values.get(TOURNAMENTS_KEY) ?? 'null');
  assert.ok(value && typeof value === 'object');
  assert.deepEqual(Object.keys(value).sort(), ['items', 'v']);
  assert.equal(values.get('other-key'), 'untouched');
  assert.equal(
    saveTournamentHistory(store, items, records[10] ?? completedTournament()).items.length,
    10,
  );
});

test('corrupt history stays untouched until a save and blocked storage keeps in-memory history', () => {
  let text = '{broken';
  const store = {
    getItem: () => text,
    setItem: (_key: string, value: string) => {
      text = value;
    },
  };
  assert.deepEqual(readTournamentHistory(store), { items: [], available: true });
  assert.equal(text, '{broken');
  const archive = completedTournament();
  assert.equal(saveTournamentHistory(store, [], archive).available, true);
  assert.deepEqual(readTournamentHistory(store).items, [archive]);
  const denied = {
    getItem: (): string => {
      throw new Error('Denied');
    },
    setItem: () => {
      throw new Error('Denied');
    },
  };
  assert.deepEqual(readTournamentHistory(denied), { items: [], available: false });
  assert.deepEqual(saveTournamentHistory(denied, [], archive), {
    items: [archive],
    available: false,
  });
  assert.equal(saveTournamentHistory(null, [], archive).available, false);
});
