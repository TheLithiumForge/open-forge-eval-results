import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PREFERENCES_KEY } from '../session/storage.ts';
import { encodeTournament } from './format.ts';
import { createTournament, recordResult } from './rules.ts';
import { keepNewest, readTournaments, TOURNAMENTS_KEY, writeTournaments } from './storage.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

const CODES = ['np1-6-3', 'np1-6-4', 'np1-8-5'];

function memoryStore(initial: Record<string, string> = {}): PreferenceStore & {
  values: Record<string, string>;
} {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    },
  };
}

const deniedStore: PreferenceStore = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
};

// Names differ by champion so that records can be told apart.
function finished(champion: string): Tournament {
  let tournament = createTournament([champion, 'Bo', 'Cora', 'Dev'], CODES);
  for (let turn = 0; turn < 6; turn += 1)
    tournament = recordResult(tournament, { moves: 40 + (turn % 2), elapsedMs: 1000 });
  return tournament;
}

test('saved tournaments are a version 3 envelope with exactly v and items', () => {
  const store = memoryStore();
  assert.equal(writeTournaments(store, [finished('Ada')]).available, true);
  const saved: unknown = JSON.parse(store.values['np3:tournaments'] ?? '');
  assert.ok(typeof saved === 'object' && saved !== null);
  assert.deepEqual(Object.keys(saved).sort(), ['items', 'v']);
  assert.equal('v' in saved && saved.v, 3);
  assert.equal(TOURNAMENTS_KEY, 'np3:tournaments');
  assert.deepEqual(readTournaments(store), { items: [finished('Ada')], available: true });
});

test('a saved list keeps the newest ten records', () => {
  let items: readonly Tournament[] = [];
  for (let record = 0; record < 12; record += 1)
    items = keepNewest(items, finished(`Ada${record}`));
  assert.equal(items.length, 10);
  assert.equal(items[0]?.players[0], 'Ada2');
  assert.equal(items.at(-1)?.players[0], 'Ada11');
  const store = memoryStore();
  writeTournaments(store, items);
  assert.equal(readTournaments(store).items.length, 10);
});

test('a missing or unusable stored value reads as an empty list and stays untouched', () => {
  assert.deepEqual(readTournaments(memoryStore()), { items: [], available: true });
  const unusable = [
    '{',
    'null',
    '[]',
    '{"v":3}',
    '{"v":2,"items":[]}',
    '{"v":3,"items":{}}',
    '{"v":3,"items":[],"extra":1}',
    '{"v":3,"items":[{"format":"neon-pairs/tournament","matches":[],"players":["Ada","Bo","Cora","Dev"],"version":1}]}',
  ];
  for (const text of unusable) {
    const store = memoryStore({ [TOURNAMENTS_KEY]: text });
    assert.deepEqual(readTournaments(store), { items: [], available: true });
    assert.equal(store.values[TOURNAMENTS_KEY], text);
  }
});

test('one bad record rejects the whole saved list', () => {
  const record: unknown = JSON.parse(encodeTournament(finished('Ada')));
  const text = JSON.stringify({ v: 3, items: [record] });
  assert.equal(readTournaments(memoryStore({ [TOURNAMENTS_KEY]: text })).items.length, 1);
  const broken = text.replace('"version":1', '"version":9');
  assert.notEqual(broken, text);
  assert.deepEqual(readTournaments(memoryStore({ [TOURNAMENTS_KEY]: broken })).items, []);
  const unfinished = JSON.stringify({
    v: 3,
    items: [JSON.parse(encodeTournament(createTournament(['Ada', 'Bo', 'Cora', 'Dev'], CODES)))],
  });
  assert.deepEqual(readTournaments(memoryStore({ [TOURNAMENTS_KEY]: unfinished })).items, []);
});

test('blocked storage reads as empty, reports itself and never throws', () => {
  assert.deepEqual(readTournaments(null), { items: [], available: false });
  assert.deepEqual(readTournaments(deniedStore), { items: [], available: false });
  assert.equal(writeTournaments(null, [finished('Ada')]).available, false);
  assert.equal(writeTournaments(deniedStore, [finished('Ada')]).available, false);
});

test('saving tournaments leaves unrelated keys and the preferences alone', () => {
  const preferences = '{"schemaVersion":1,"size":10,"bestMoves":{"4":12}}';
  const store = memoryStore({ [PREFERENCES_KEY]: preferences, other: 'kept' });
  writeTournaments(store, [finished('Ada')]);
  assert.equal(store.values[PREFERENCES_KEY], preferences);
  assert.equal(store.values.other, 'kept');
});
