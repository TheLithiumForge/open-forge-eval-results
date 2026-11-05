import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createTournament, recordResult } from './rules.ts';
import { readPastTournaments, saveTournament, TOURNAMENTS_KEY } from './storage.ts';
import type { Tournament } from './rules.ts';

// A finished four-player tournament whose first player wins every match.
function finished(first: string): Tournament {
  let seed = 0;
  const start = createTournament([first, 'Bo', 'Cora', 'Dev'], (size) => `np1-${size}-${++seed}`);
  return [20, 21, 20, 21, 34, 35].reduce(
    (tournament, moves) => recordResult(tournament, { moves, elapsedMs: 1000 }),
    start,
  );
}

function memoryStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    values,
    writes,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(key);
      values.set(key, value);
    },
  };
}

test('finished tournaments save as a v3 envelope under a namespaced key and read back', () => {
  const store = memoryStore({ other: 'kept' });
  const saved = saveTournament(store, readPastTournaments(store), finished('Ada'));
  assert.equal(TOURNAMENTS_KEY, 'np3:tournaments');
  const value: unknown = JSON.parse(store.values.get(TOURNAMENTS_KEY) ?? '');
  assert.ok(value && typeof value === 'object');
  assert.deepEqual(Object.keys(value), ['v', 'items']);
  assert.equal(store.values.get('other'), 'kept');
  assert.deepEqual(readPastTournaments(store), saved);
  assert.deepEqual(saved, { items: [finished('Ada')], available: true });
});

test('a saved list keeps its newest 10 records, newest first', () => {
  const store = memoryStore();
  let past = readPastTournaments(store);
  for (let index = 1; index <= 12; index += 1)
    past = saveTournament(store, past, finished(`Player ${index}`));
  const read = readPastTournaments(store);
  assert.equal(read.items.length, 10);
  assert.deepEqual(
    read.items.map((tournament) => tournament.players[0]),
    Array.from({ length: 10 }, (_, index) => `Player ${12 - index}`),
  );
});

test('an unreadable or invalid value reads as no records and stays untouched until a save', () => {
  const record = JSON.stringify(finished('Ada'));
  const done = finished('Ada');
  const unfinished = {
    ...done,
    matches: done.matches.map((match, index) => (index === 2 ? { ...match, results: [] } : match)),
  };
  for (const text of [
    '{',
    'null',
    '{"v":3}',
    '{"v":2,"items":[]}',
    '{"v":3,"items":[],"extra":1}',
    `{"v":3,"items":[${record}],"extra":[]}`,
    `{"v":3,"items":[${JSON.stringify({ ...finished('Ada'), players: ['A', 'B', 'C', 'D'] })}]}`,
    `{"v":3,"items":[${JSON.stringify(unfinished)}]}`,
  ]) {
    const store = memoryStore({ [TOURNAMENTS_KEY]: text });
    assert.deepEqual(readPastTournaments(store), { items: [], available: true }, text);
    assert.deepEqual(store.writes, []);
    assert.equal(store.values.get(TOURNAMENTS_KEY), text);
    saveTournament(store, readPastTournaments(store), finished('Ada'));
    assert.notEqual(store.values.get(TOURNAMENTS_KEY), text);
  }
});

test('blocked storage keeps records in memory and never replaces values it could not read', () => {
  const denied = {
    getItem: (): string | null => {
      throw new Error('SecurityError');
    },
    setItem: () => assert.fail('A failed read must not lead to a write.'),
  };
  const blocked = saveTournament(denied, readPastTournaments(denied), finished('Ada'));
  assert.deepEqual(blocked, { items: [finished('Ada')], available: false });
  assert.deepEqual(saveTournament(null, readPastTournaments(null), finished('Bo')), {
    items: [finished('Bo')],
    available: false,
  });
  const full = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  const memory = saveTournament(full, readPastTournaments(full), finished('Cora'));
  assert.deepEqual(memory, { items: [finished('Cora')], available: false });
});
