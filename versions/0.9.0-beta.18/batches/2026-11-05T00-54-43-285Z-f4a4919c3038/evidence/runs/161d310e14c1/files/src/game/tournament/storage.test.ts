import assert from 'node:assert/strict';
import { test } from 'vitest';
import { readTournaments, retainTournament, writeTournaments, TOURNAMENTS_KEY } from './storage.ts';
import { exampleTournament, finishedExampleTournament } from './tournament.fixture.ts';
import type { TournamentState } from './model.ts';

test('completed history uses the new envelope and retains the newest ten distinct events', () => {
  let items: readonly TournamentState[] = [];
  for (let seed = 1; seed <= 12; seed += 1)
    items = retainTournament(items, finishedExampleTournament(4, seed));
  assert.equal(items.length, 10);
  assert.equal(items[0]?.matches[0]?.boardCode, 'np1-6-12');
  assert.equal(items[9]?.matches[0]?.boardCode, 'np1-6-3');
  const latest = items[0];
  assert.ok(latest);
  assert.equal(retainTournament(items, latest).length, 10);
  assert.equal(retainTournament(items, exampleTournament()), items);
  const values = new Map([['unrelated', 'keep']]);
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  assert.deepEqual(writeTournaments(store, items), { saved: true });
  const raw: unknown = JSON.parse(values.get(TOURNAMENTS_KEY) ?? '');
  assert.ok(raw && typeof raw === 'object' && 'v' in raw && raw.v === 3);
  assert.deepEqual(Object.keys(raw).sort(), ['items', 'v']);
  assert.deepEqual(readTournaments(store).items, items);
  assert.equal(values.get('unrelated'), 'keep');
});

test('corrupt history is silently ignored without a write and blocked storage reports failure', () => {
  let writes = 0;
  for (const text of [
    '{',
    '{"v":2,"items":[]}',
    '{"v":3,"items":[{}]}',
    '{"v":3,"items":[],"extra":0}',
  ]) {
    const store = {
      getItem: () => text,
      setItem: () => {
        writes += 1;
      },
    };
    assert.deepEqual(readTournaments(store), { items: [], blocked: false });
  }
  assert.equal(writes, 0);
  const denied = {
    getItem: () => {
      throw Error('denied');
    },
    setItem: () => {
      throw Error('denied');
    },
  };
  assert.deepEqual(readTournaments(denied), { items: [], blocked: true });
  assert.deepEqual(readTournaments(null), { items: [], blocked: true });
  assert.deepEqual(writeTournaments(denied, []), { saved: false });
  assert.deepEqual(writeTournaments(null, []), { saved: false });
});
