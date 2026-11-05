import assert from 'node:assert/strict';
import { test } from 'vitest';
import { readTournaments, saveTournament, TOURNAMENTS_KEY } from './records.ts';
import { createTournament } from './rules.ts';
import { countingDraw, EIGHT, finishedTournament, FOUR } from './tournament.fixture.ts';
import { tournamentData } from './format.ts';
import type { PreferenceStore } from '../session/storage.ts';

function memoryStore(values: Record<string, string> = {}) {
  const writes: string[] = [];
  const store: PreferenceStore = {
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      writes.push(key);
      values[key] = value;
    },
  };
  return { store, values, writes };
}

const refusing: PreferenceStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('SecurityError');
  },
};

test('a finished tournament is saved in the v3 envelope beside unrelated keys', () => {
  const { store, values } = memoryStore({ other: 'kept' });
  const empty = readTournaments(store);
  assert.deepEqual(empty, { items: [], saving: true });
  const tournament = finishedTournament();
  const saved = saveTournament(store, empty, tournament);
  assert.deepEqual(saved, { items: [tournament], saving: true });
  assert.equal(TOURNAMENTS_KEY, 'np3:tournaments');
  const stored: unknown = JSON.parse(values[TOURNAMENTS_KEY] ?? '');
  assert.deepEqual(stored, { v: 3, items: [tournamentData(tournament)] });
  assert.deepEqual(readTournaments(store), saved);
  assert.equal(values.other, 'kept');
});

test('the list keeps its newest ten records, newest first', () => {
  const { store } = memoryStore();
  const players = ['Ann', 'Ben', 'Cid', 'Dot', 'Eve', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kit'];
  let saved = readTournaments(store);
  for (const name of players)
    saved = saveTournament(store, saved, finishedTournament([name, 'Bo', 'Cora', 'Dev']));
  const firsts = readTournaments(store).items.map((tournament) => tournament.players[0]);
  assert.deepEqual(firsts, [...players].reverse().slice(0, 10));
});

test('stored text that fails to parse or validate reads as empty and stays until the next save', () => {
  const unfinished = { v: 3, items: [tournamentData(createTournament(FOUR, countingDraw()))] };
  const finished = tournamentData(finishedTournament(EIGHT));
  for (const text of [
    '{',
    'null',
    JSON.stringify({ v: 2, items: [] }),
    JSON.stringify({ v: 3, items: [], extra: 1 }),
    JSON.stringify(unfinished),
    JSON.stringify({ v: 3, items: [finished, { ...finished, players: [] }] }),
  ]) {
    const { store, values, writes } = memoryStore({ [TOURNAMENTS_KEY]: text });
    const saved = readTournaments(store);
    assert.deepEqual(saved, { items: [], saving: true });
    assert.deepEqual(writes, []);
    assert.equal(values[TOURNAMENTS_KEY], text);
    saveTournament(store, saved, finishedTournament());
    assert.equal(readTournaments(store).items.length, 1);
  }
});

test('blocked storage keeps records in memory and writes nothing over an unread list', () => {
  const refused = readTournaments(refusing);
  assert.deepEqual(refused, { items: [], saving: false });
  const tournament = finishedTournament();
  assert.deepEqual(saveTournament(refusing, refused, tournament), {
    items: [tournament],
    saving: false,
  });
  assert.deepEqual(saveTournament(null, readTournaments(null), tournament).saving, false);
  const { store, writes } = memoryStore();
  assert.deepEqual(saveTournament(store, refused, tournament).saving, false);
  assert.deepEqual(writes, []);
  const failing = { ...memoryStore().store, setItem: refusing.setItem };
  assert.deepEqual(saveTournament(failing, readTournaments(failing), tournament), {
    items: [tournament],
    saving: false,
  });
});
