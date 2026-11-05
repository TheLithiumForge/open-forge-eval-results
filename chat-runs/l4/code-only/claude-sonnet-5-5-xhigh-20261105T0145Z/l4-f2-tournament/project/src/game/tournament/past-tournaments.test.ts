import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  PAST_TOURNAMENTS_KEY,
  PAST_TOURNAMENTS_MAX,
  PAST_TOURNAMENTS_VERSION,
  readPastTournaments,
  rememberTournament,
  writePastTournaments,
} from './past-tournaments.ts';
import { savedTournament } from './tournament-format.ts';
import { createTournament } from './tournament.ts';
import {
  dealCodes,
  FOUR_PLAYERS,
  firstPlayersWin,
  newTournament,
  playTurns,
  turn,
} from './tournament.fixture.ts';
import type { PreferenceStore } from '../session/storage.ts';

function memoryStore(initial = ''): PreferenceStore {
  const entries = new Map([[PAST_TOURNAMENTS_KEY, initial]]);
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

// Tournaments differ by their deals, so a seed offset makes each one new.
function finished(offset: number) {
  const codes = dealCodes(3 + offset).slice(offset);
  return firstPlayersWin(createTournament(FOUR_PLAYERS, codes));
}

test('finished tournaments survive storage in the order they were saved', () => {
  const store = memoryStore();
  const list = [finished(1), finished(0)];
  writePastTournaments(store, list);
  assert.deepEqual(readPastTournaments(store), list);
});

test('a tournament that is not finished is not read back', () => {
  const store = memoryStore();
  writePastTournaments(store, [newTournament(FOUR_PLAYERS), finished(0)]);
  assert.deepEqual(readPastTournaments(store), [finished(0)]);
  const partial = playTurns(newTournament(FOUR_PLAYERS), [turn(8), turn(9)]);
  writePastTournaments(store, [partial]);
  assert.deepEqual(readPastTournaments(store), []);
});

test('an entry that no longer reads is dropped and the others stay', () => {
  const good = savedTournament(finished(0));
  const text = JSON.stringify({
    schemaVersion: PAST_TOURNAMENTS_VERSION,
    tournaments: [{ ...good, version: 99 }, good, 'text', null],
  });
  assert.deepEqual(readPastTournaments(memoryStore(text)), [finished(0)]);
});

for (const [index, text] of [
  '',
  '{',
  'null',
  '[]',
  JSON.stringify({ schemaVersion: 2, tournaments: [] }),
  JSON.stringify({ schemaVersion: PAST_TOURNAMENTS_VERSION }),
  JSON.stringify({ schemaVersion: PAST_TOURNAMENTS_VERSION, tournaments: {} }),
].entries())
  test(`unreadable saved tournaments give an empty list ${index + 1}`, () => {
    assert.deepEqual(readPastTournaments(memoryStore(text)), []);
  });

test('the newest tournament comes first and a repeated one keeps its place', () => {
  const first = finished(0);
  const second = finished(1);
  const list = rememberTournament(rememberTournament([], first), second);
  assert.deepEqual(list, [second, first]);
  assert.equal(rememberTournament(list, first), list);
  assert.equal(rememberTournament(list, JSON.parse(JSON.stringify(second))), list);
});

test('the list keeps the newest tournaments up to its limit', () => {
  let list: ReturnType<typeof rememberTournament> = [];
  for (let offset = 0; offset <= PAST_TOURNAMENTS_MAX; offset += 1)
    list = rememberTournament(list, finished(offset));
  assert.equal(list.length, PAST_TOURNAMENTS_MAX);
  assert.deepEqual(list[0], finished(PAST_TOURNAMENTS_MAX));
  assert.equal(
    list.some((tournament) => JSON.stringify(tournament) === JSON.stringify(finished(0))),
    false,
  );
  const store = memoryStore();
  writePastTournaments(store, list);
  assert.equal(readPastTournaments(store).length, PAST_TOURNAMENTS_MAX);
});

test('storage failures keep the tournament screen working and touch no other key', () => {
  const denied: PreferenceStore = {
    getItem: () => {
      throw new Error();
    },
    setItem: () => {
      throw new Error();
    },
  };
  assert.deepEqual(readPastTournaments(denied), []);
  assert.deepEqual(readPastTournaments(null), []);
  assert.doesNotThrow(() => writePastTournaments(denied, [finished(0)]));
  assert.doesNotThrow(() => writePastTournaments(null, [finished(0)]));
  const store = memoryStore();
  store.setItem('another-application', 'kept');
  writePastTournaments(store, [finished(0)]);
  assert.equal(store.getItem('another-application'), 'kept');
});
