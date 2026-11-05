import assert from 'node:assert/strict';
import { test } from 'vitest';
import { prependPastTournament, readPastTournaments, hasSavedPastTournaments } from './storage.ts';
import { COMPLETED_TOURNAMENT_RECORD } from './tournament.fixture.ts';
import type { TournamentRecord } from './model.ts';
import type { PreferenceStore } from '../session/storage.ts';

class MemoryStore implements PreferenceStore {
  value: string | null = null;

  getItem(): string | null {
    return this.value;
  }

  setItem(key: string, value: string): void {
    if (key !== 'neon-pairs.tournaments.v1') throw new Error('Unexpected key.');
    this.value = value;
  }
}

test('past tournament storage uses its feature envelope and retains ten newest records', () => {
  const records = Array.from({ length: 12 }, (_, index) => ({
    ...COMPLETED_TOURNAMENT_RECORD,
    startedAtMs: index + 1,
  }));
  let retained: readonly TournamentRecord[] = [];
  for (const record of records) retained = prependPastTournament(retained, record);
  const store = new MemoryStore();
  assert.equal(hasSavedPastTournaments(store, retained), true);
  assert.deepEqual(JSON.parse(store.value ?? '{}'), {
    v: 3,
    items: retained,
  });
  const loaded = readPastTournaments(store);
  assert.equal(loaded.length, 10);
  assert.equal(loaded[0]?.startedAtMs, 12);
  assert.equal(loaded[9]?.startedAtMs, 3);
});

test('storage failures and corrupt past data leave a usable empty history', () => {
  const store = new MemoryStore();
  store.value = '{';
  assert.deepEqual(readPastTournaments(store), []);
  const deniedStore: PreferenceStore = {
    getItem() {
      throw new Error('Denied.');
    },
    setItem() {
      throw new Error('Denied.');
    },
  };
  assert.deepEqual(readPastTournaments(deniedStore), []);
  assert.equal(hasSavedPastTournaments(deniedStore, [COMPLETED_TOURNAMENT_RECORD]), false);
  assert.equal(hasSavedPastTournaments(null, [COMPLETED_TOURNAMENT_RECORD]), false);
});
