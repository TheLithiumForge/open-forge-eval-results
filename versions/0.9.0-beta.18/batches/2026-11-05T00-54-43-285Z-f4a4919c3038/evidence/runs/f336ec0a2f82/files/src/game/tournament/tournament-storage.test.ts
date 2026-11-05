import assert from 'node:assert/strict';
import { test } from 'vitest';
import { readTournaments, TOURNAMENTS_KEY, writeTournaments } from './tournament-storage.ts';
import { completedTournament } from './tournament.fixture.ts';
import type { PreferenceStore } from '../session/storage.ts';

test('completed tournaments survive storage round trips without changing other preferences', () => {
  const entries = new Map([['unrelated', 'kept']]);
  const store: PreferenceStore = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
  const history = [completedTournament(4), completedTournament(8)];
  assert.equal(writeTournaments(store, history), '');
  assert.deepEqual(readTournaments(store), history);
  assert.equal(entries.get('unrelated'), 'kept');
  entries.set(TOURNAMENTS_KEY, '{');
  assert.deepEqual(readTournaments(store), []);
});

test('blocked tournament storage returns empty history and explains save failures', () => {
  const denied: PreferenceStore = {
    getItem: () => {
      throw new Error('Blocked');
    },
    setItem: () => {
      throw new Error('Blocked');
    },
  };
  for (const store of [denied, null]) {
    assert.deepEqual(readTournaments(store), []);
    assert.match(writeTournaments(store, [completedTournament()]), /Export/);
  }
});
