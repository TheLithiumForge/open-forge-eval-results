import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createTournament, recordTurn } from './bracket.ts';
import {
  PAST_TOURNAMENTS_KEY,
  PAST_TOURNAMENTS_MAX,
  PAST_TOURNAMENTS_VERSION,
  readPastTournaments,
  rememberTournament,
  writePastTournaments,
} from './tournament-storage.ts';
import { PREFERENCES_KEY } from '../session/storage.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './bracket.ts';

function memoryStore(initial = ''): PreferenceStore {
  const entries = new Map([[PAST_TOURNAMENTS_KEY, initial]]);
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

function finished(champion: string): Tournament {
  const started = createTournament(
    [champion, 'Ben', 'Cy', 'Di'],
    ['np1-4-1', 'np1-4-2', 'np1-4-3'],
  );
  return [8, 9, 9, 10, 8, 9]
    .map((moves) => ({ moves, elapsedMs: 1000 }))
    .reduce(recordTurn, started);
}

test('finished tournaments survive a storage round trip in the order they finished', () => {
  const store = memoryStore();
  const past = rememberTournament(rememberTournament([], finished('Ann')), finished('Ali'));
  writePastTournaments(store, past);
  assert.deepEqual(readPastTournaments(store), past);
  assert.deepEqual(
    readPastTournaments(store).map((tournament) => tournament.players[0]),
    ['Ann', 'Ali'],
  );
});

test('the list keeps only the most recent finished tournaments', () => {
  let past: readonly Tournament[] = [];
  for (let index = 0; index <= PAST_TOURNAMENTS_MAX; index += 1)
    past = rememberTournament(past, finished(`P${index}`));
  assert.equal(past.length, PAST_TOURNAMENTS_MAX);
  assert.equal(past[0]?.players[0], 'P1');
  assert.equal(past.at(-1)?.players[0], `P${PAST_TOURNAMENTS_MAX}`);
});

test('damaged or unfinished entries drop out and unreadable data gives an empty list', () => {
  const kept = finished('Ann');
  const store = memoryStore();
  writePastTournaments(store, [kept]);
  const value = JSON.parse(store.getItem(PAST_TOURNAMENTS_KEY) ?? '');
  const unfinished = {
    ...value.tournaments[0],
    matches: createTournament(['A', 'B', 'C', 'D'], ['np1-4-1', 'np1-4-2', 'np1-4-3']).matches,
  };
  value.tournaments.push({ broken: true }, unfinished, { ...value.tournaments[0], stage: 'ready' });
  store.setItem(PAST_TOURNAMENTS_KEY, JSON.stringify(value));
  assert.deepEqual(readPastTournaments(store), [kept]);
  for (const text of ['{', 'null', '{}', JSON.stringify({ schemaVersion: 2, tournaments: [] })])
    assert.deepEqual(readPastTournaments(memoryStore(text)), []);
  assert.deepEqual(
    readPastTournaments(
      memoryStore(JSON.stringify({ schemaVersion: PAST_TOURNAMENTS_VERSION, tournaments: {} })),
    ),
    [],
  );
});

test('blocked storage keeps play going and never changes unrelated keys', () => {
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
  assert.doesNotThrow(() => writePastTournaments(denied, [finished('Ann')]));
  const store = memoryStore();
  store.setItem(PREFERENCES_KEY, 'kept');
  writePastTournaments(store, [finished('Ann')]);
  assert.equal(store.getItem(PREFERENCES_KEY), 'kept');
});
