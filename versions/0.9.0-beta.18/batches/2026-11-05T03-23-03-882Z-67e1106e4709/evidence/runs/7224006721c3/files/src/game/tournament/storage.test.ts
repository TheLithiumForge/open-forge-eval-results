import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createTournament, recordTournamentResult } from './rules.ts';
import { readTournaments, retainTournament, TOURNAMENTS_KEY, writeTournaments } from './storage.ts';

function completed(seed: number) {
  let event = createTournament(
    ['Ada', 'Bo', 'Cora', 'Dev'],
    [`np1-6-${seed}`, `np1-6-${seed + 1}`, `np1-8-${seed}`],
  );
  for (let match = 0; match < 3; match += 1)
    for (let turn = 0; turn < 2; turn += 1)
      event = recordTournamentResult(event, match, {
        moves: match === 2 ? 32 : 18,
        elapsedMs: 1000.25,
      });
  return event;
}

test('completed tournaments save in the exact envelope and keep the ten newest distinct records', () => {
  const data = new Map<string, string>([['other-data', 'untouched']]);
  const store = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  let items = readTournaments(store).items;
  for (let seed = 1; seed <= 12; seed += 1) items = retainTournament(items, completed(seed));
  assert.equal(items.length, 10);
  assert.equal(items[0]?.matches[0]?.boardCode, 'np1-6-12');
  assert.equal(items[9]?.matches[0]?.boardCode, 'np1-6-3');
  items = retainTournament(items, completed(12));
  assert.equal(items.length, 10);
  assert.equal(writeTournaments(store, items), true);
  assert.deepEqual(JSON.parse(data.get(TOURNAMENTS_KEY) ?? ''), { v: 3, items });
  assert.deepEqual(readTournaments(store), { items, unavailable: false });
  assert.equal(data.get('other-data'), 'untouched');
});

test('corrupt stored data is read as empty without changing its original text', () => {
  for (const text of [
    '{',
    '{"v":2,"items":[]}',
    '{"v":3,"items":[],"extra":true}',
    JSON.stringify({
      v: 3,
      items: [createTournament(['Ada', 'Bo', 'Cora', 'Dev'], ['np1-6-1', 'np1-6-2', 'np1-8-1'])],
    }),
  ]) {
    const store = { getItem: () => text, setItem: () => assert.fail('Read must not write.') };
    assert.deepEqual(readTournaments(store), { items: [], unavailable: false });
  }
});

test('denied reads and writes leave results usable in memory and report unavailable storage', () => {
  const denied = {
    getItem: (): string | null => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
  assert.deepEqual(readTournaments(denied), { items: [], unavailable: true });
  assert.deepEqual(readTournaments(null), { items: [], unavailable: true });
  const items = retainTournament([], completed(1));
  assert.equal(writeTournaments(denied, items), false);
  assert.equal(writeTournaments(null, items), false);
  assert.equal(items.length, 1);
});
