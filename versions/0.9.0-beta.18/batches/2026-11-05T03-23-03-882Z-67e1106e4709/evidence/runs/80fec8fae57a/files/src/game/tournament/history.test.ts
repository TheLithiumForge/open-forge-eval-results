import assert from 'node:assert/strict';
import { test } from 'vitest';
import { TOURNAMENTS_KEY, readTournaments, saveTournament } from './history.ts';
import { completedTournament } from './tournament.fixture.ts';
import type { PreferenceStore } from '../session/storage.ts';

test('finished history uses the feature namespace and envelope and retains the newest ten', () => {
  const data = new Map<string, string>();
  data.set('other', 'untouched');
  const store: PreferenceStore = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
  let history = readTournaments(store);
  for (let seed = 1; seed <= 12; seed += 1)
    history = saveTournament(store, history.items, completedTournament(seed));
  assert.equal(TOURNAMENTS_KEY, 'np3:tournaments');
  assert.equal(history.items.length, 10);
  const stored: unknown = JSON.parse(data.get(TOURNAMENTS_KEY) ?? 'null');
  assert.ok(stored && typeof stored === 'object');
  assert.deepEqual(Object.keys(stored).sort(), ['items', 'v']);
  assert.equal('v' in stored && stored.v, 3);
  const reloaded = readTournaments(store);
  assert.equal(reloaded.items[0]?.game.boardCode, 'np1-8-14');
  assert.equal(reloaded.items[9]?.game.boardCode, 'np1-8-5');
  assert.equal(data.get('other'), 'untouched');
  const first = history.items[0];
  assert.ok(first);
  assert.equal(saveTournament(store, history.items, first).items.length, 10);
});

test('corrupt history is empty and remains untouched until a real save', () => {
  for (const text of [
    '{',
    '{"v":2,"items":[]}',
    '{"v":3,"items":[{}]}',
    '{"v":3,"items":[],"extra":true}',
  ]) {
    const data = new Map([[TOURNAMENTS_KEY, text]]);
    const store = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    assert.deepEqual(readTournaments(store), { items: [], blocked: false });
    assert.equal(data.get(TOURNAMENTS_KEY), text);
    saveTournament(store, [], completedTournament());
    assert.equal(readTournaments(store).items.length, 1);
  }
});

test('failed reads or writes preserve usable in-memory history and report blocked storage', () => {
  const denied = {
    getItem(): null {
      throw new Error('denied');
    },
    setItem(): void {
      throw new Error('denied');
    },
  };
  assert.equal(readTournaments(denied).blocked, true);
  assert.equal(readTournaments(null).blocked, true);
  for (const store of [denied, null]) {
    const history = saveTournament(store, [], completedTournament());
    assert.equal(history.items.length, 1);
    assert.equal(history.blocked, true);
  }
});
