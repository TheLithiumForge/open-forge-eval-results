import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  readTournaments,
  saveTournament,
  TOURNAMENTS_KEY,
  TOURNAMENT_RETENTION,
} from './storage.ts';
import { finishedTournament } from './tournament.fixture.ts';
import { encodeTournament } from './format.ts';
import { isJsonObject, parseJson } from '../saved-format.ts';

test('completed records survive a reload with the exact envelope, namespace and newest ten retention', () => {
  const data = new Map<string, string>([['other', 'untouched']]);
  const store = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, text: string) => {
      data.set(key, text);
    },
  };
  let history = readTournaments(store);
  for (let seed = 1; seed <= 12; seed++)
    history = saveTournament(store, history, finishedTournament(4, seed));
  assert.equal(history.items.length, TOURNAMENT_RETENTION);
  assert.equal(history.items[0]?.matches[0]?.boardCode, 'np1-6-12');
  assert.equal(history.items.at(-1)?.matches[0]?.boardCode, 'np1-6-3');
  assert.equal(TOURNAMENTS_KEY, 'np3:tournaments');
  const value = parseJson(data.get(TOURNAMENTS_KEY) ?? '');
  assert.ok(isJsonObject(value));
  assert.deepEqual(Object.keys(value).sort(), ['items', 'v']);
  assert.equal(value.v, 3);
  assert.deepEqual(readTournaments(store), history);
  assert.equal(data.get('other'), 'untouched');
  history = saveTournament(store, history, finishedTournament(4, 12));
  assert.equal(history.items.length, 10);
});

test('corrupt records stay untouched until a real save and storage failures keep memory results', () => {
  for (const text of ['{', '{}', '{"v":3,"items":[{}]}', '{"v":3,"items":[],"extra":1}']) {
    const store = {
      getItem: () => text,
      setItem: () => {
        throw new Error('Unexpected write.');
      },
    };
    assert.deepEqual(readTournaments(store), { items: [], blocked: false });
  }
  const broken = {
    getItem: (): string => {
      throw new Error('Blocked.');
    },
    setItem: () => {
      throw new Error('Blocked.');
    },
  };
  assert.equal(readTournaments(broken).blocked, true);
  const complete = finishedTournament();
  const memory = saveTournament(broken, readTournaments(broken), complete);
  assert.equal(memory.blocked, true);
  assert.equal(encodeTournament(memory.items[0] ?? complete), encodeTournament(complete));
  assert.equal(saveTournament(null, { items: [], blocked: true }, complete).items.length, 1);
});
