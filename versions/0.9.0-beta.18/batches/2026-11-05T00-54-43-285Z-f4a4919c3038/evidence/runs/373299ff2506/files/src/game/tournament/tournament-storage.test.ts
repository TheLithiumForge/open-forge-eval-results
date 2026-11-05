import assert from 'node:assert/strict';
import { test } from 'vitest';
import { completeSampleTurn, sampleTournament } from './tournament.fixture.ts';
import {
  readPastTournaments,
  TOURNAMENTS_KEY,
  writePastTournaments,
} from './tournament-storage.ts';
import type { PreferenceStore } from '../session/storage.ts';

test('completed tournaments retain the entire bracket without changing unrelated saved data', () => {
  let finished = sampleTournament();
  for (let turn = 0; turn < 6; turn++) finished = completeSampleTurn(finished);
  const entries = new Map([['unrelated', 'keep']]);
  const store: PreferenceStore = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
  writePastTournaments(store, [finished]);
  assert.deepEqual(readPastTournaments(store), [finished]);
  assert.equal(entries.get('unrelated'), 'keep');
  for (const invalid of [
    '{',
    '{}',
    'null',
    JSON.stringify({ version: 1, tournaments: [sampleTournament()] }),
  ]) {
    store.setItem(TOURNAMENTS_KEY, invalid);
    assert.deepEqual(readPastTournaments(store), []);
  }
});

test('blocked tournament storage leaves play and JSON backup available', () => {
  const denied: PreferenceStore = {
    getItem: () => {
      throw new Error('Blocked');
    },
    setItem: () => {
      throw new Error('Blocked');
    },
  };
  assert.deepEqual(readPastTournaments(denied), []);
  assert.doesNotThrow(() => writePastTournaments(denied, []));
  assert.deepEqual(readPastTournaments(null), []);
  assert.doesNotThrow(() => writePastTournaments(null, []));
});
