import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createTournament, finishTurn, nextMatch, nextTurn, startTurn } from './rules.ts';
import { readTournaments, saveTournaments, TOURNAMENTS_KEY } from './storage.ts';
import { boardCode } from '../deck.ts';
import type { PreferenceStore } from '../session/storage.ts';

function completed(seed: number) {
  let state = createTournament(
    ['Ada', 'Bo', 'Cy', 'De'],
    [boardCode(6, seed), boardCode(6, seed + 1), boardCode(8, seed)],
  );
  for (const moves of [18, 18, 32]) {
    state = finishTurn(startTurn(state), { moves, elapsedMs: 0 });
    state = finishTurn(startTurn(nextTurn(state)), { moves, elapsedMs: 0 });
    state = nextMatch(state);
  }
  return state;
}

test('history retains the newest ten completed records in the exact feature envelope', () => {
  const values = new Map<string, string>([['unrelated', 'keep']]);
  const store: PreferenceStore = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  const items = Array.from({ length: 12 }, (_, i) => completed(12 - i));
  assert.equal(saveTournaments(store, items), true);
  assert.deepEqual(readTournaments(store), { items: items.slice(0, 10), blocked: false });
  assert.equal(values.get('unrelated'), 'keep');
  const raw: unknown = JSON.parse(values.get(TOURNAMENTS_KEY) ?? 'null');
  assert.deepEqual(Object.keys(Object(raw)).sort(), ['items', 'v']);
});

test('invalid storage remains untouched until a save and denied storage leaves usable memory data', () => {
  let text = '{';
  const store = {
    getItem: () => text,
    setItem: (_key: string, value: string) => {
      text = value;
    },
  };
  assert.deepEqual(readTournaments(store), { items: [], blocked: false });
  assert.equal(text, '{');
  assert.equal(saveTournaments(store, [completed(1)]), true);
  assert.equal(readTournaments(store).items.length, 1);
  const denied = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.deepEqual(readTournaments(denied), { items: [], blocked: true });
  assert.equal(saveTournaments(denied, [completed(1)]), false);
  assert.deepEqual(readTournaments(null), { items: [], blocked: true });
});
