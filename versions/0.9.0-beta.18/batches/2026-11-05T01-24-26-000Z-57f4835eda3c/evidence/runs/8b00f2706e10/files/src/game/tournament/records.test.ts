import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { readPastTournaments, savePastTournament, TOURNAMENTS_KEY } from './records.ts';
import { createTournament, recordResult } from './rules.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './rules.ts';

function memoryStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: string[] = [];
  const store: PreferenceStore = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(key);
      values.set(key, value);
    },
  };
  return { store, values, writes };
}

const denied: PreferenceStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('SecurityError');
  },
};

let seed = 0;
function finished(players: readonly string[]): Tournament {
  const start = createTournament(players, (size) => boardCode(size, (seed += 1)));
  return [18, 19, 18, 19, 32, 33].reduce(
    (next, moves) => recordResult(next, { moves, elapsedMs: moves * 1000 }),
    start,
  );
}

test('saved tournaments use the np3 envelope and keep the newest ten', () => {
  const { store, values } = memoryStore({ other: 'kept' });
  let past = readPastTournaments(store);
  assert.deepEqual(past, { records: [], saving: true });
  const saved = Array.from({ length: 12 }, (_, index) =>
    finished(['Ada', 'Bo', 'Cora', `Player ${index + 1}`]),
  );
  for (const record of saved) past = savePastTournament(store, past, record);
  assert.deepEqual(past.records, saved.slice(2).reverse());
  const stored: unknown = JSON.parse(values.get(TOURNAMENTS_KEY) ?? '');
  assert.ok(typeof stored === 'object' && stored !== null);
  assert.deepEqual(Object.keys(stored).sort(), ['items', 'v']);
  assert.deepEqual(readPastTournaments(store), past);
  assert.equal(values.get('other'), 'kept');
});

test('unusable saved text reads as empty and stays untouched until the next save', () => {
  const unfinished = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], (size) =>
    boardCode(size, (seed += 1)),
  );
  const record = finished(['Ada', 'Bo', 'Cora', 'Dev']);
  const items = [{ matches: record.matches, players: record.players }];
  for (const text of [
    '{',
    '[]',
    JSON.stringify({ v: 2, items }),
    JSON.stringify({ v: 3, items, extra: true }),
    JSON.stringify({
      v: 3,
      items: [...items, { players: unfinished.players, matches: unfinished.matches }],
    }),
  ]) {
    const { store, values, writes } = memoryStore({ [TOURNAMENTS_KEY]: text });
    const past = readPastTournaments(store);
    assert.deepEqual(past, { records: [], saving: true }, text);
    assert.deepEqual(writes, []);
    assert.equal(values.get(TOURNAMENTS_KEY), text);
    savePastTournament(store, past, record);
    assert.deepEqual(readPastTournaments(store).records, [record]);
  }
});

test('blocked storage keeps finished tournaments in memory without saving', () => {
  const record = finished(['Ada', 'Bo', 'Cora', 'Dev']);
  for (const store of [null, denied]) {
    const past = readPastTournaments(store);
    assert.deepEqual(past, { records: [], saving: false });
    assert.deepEqual(savePastTournament(store, past, record), { records: [record], saving: false });
  }
  const { store } = memoryStore();
  const full: PreferenceStore = { getItem: store.getItem, setItem: denied.setItem };
  const past = savePastTournament(full, readPastTournaments(full), record);
  assert.deepEqual(past, { records: [record], saving: false });
});
