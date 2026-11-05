import assert from 'node:assert/strict';
import { test } from 'vitest';
import { finishTournamentTurn, nextTournamentTurn, TournamentPhase } from './rules.ts';
import { tournamentFixture, wonTournamentGame } from './tournament.fixture.ts';
import { readTournaments, saveTournaments, TOURNAMENTS_KEY } from './storage.ts';
import { isJsonObject, parseJson } from '../saved-format.ts';

function complete() {
  let tournament = tournamentFixture();
  for (let turn = 0; turn < 6; turn++) {
    tournament = finishTournamentTurn(
      { ...tournament, phase: TournamentPhase.playing },
      wonTournamentGame(tournament.game),
    );
    if (turn < 5) tournament = nextTournamentTurn(tournament);
  }
  return tournament;
}

test('saved tournaments use the new namespace and exact envelope and retain the newest ten', () => {
  const values = new Map<string, string>([['unrelated', 'preserved']]);
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const finished = complete();
  const items = Array.from({ length: 12 }, (_, index) => ({
    ...finished,
    names: [`Ada ${index}`, 'Bo', 'Cora', 'Dev'],
  }));
  assert.ok(saveTournaments(store, items));
  assert.equal(values.get('unrelated'), 'preserved');
  assert.equal(TOURNAMENTS_KEY, 'np3:tournaments');
  const value = parseJson(values.get(TOURNAMENTS_KEY) ?? '');
  assert.ok(isJsonObject(value));
  assert.deepEqual(Object.keys(value).sort(), ['items', 'v']);
  assert.equal(value.v, 3);
  const loaded = readTournaments(store);
  assert.equal(loaded.blocked, false);
  assert.equal(loaded.items.length, 10);
  assert.deepEqual(
    loaded.items.map((item) => item.names[0]),
    items.slice(0, 10).map((item) => item.names[0]),
  );
});

test('corrupt data is rejected silently without changing storage and denied operations are reported', () => {
  let text = '{';
  const store = {
    getItem: () => text,
    setItem: (_key: string, value: string) => {
      text = value;
    },
  };
  assert.deepEqual(readTournaments(store), { items: [], blocked: false });
  assert.equal(text, '{');
  assert.deepEqual(readTournaments(null), { items: [], blocked: true });
  assert.equal(saveTournaments(null, [complete()]), false);
  const denied = {
    getItem: () => {
      throw new Error('Denied');
    },
    setItem: () => {
      throw new Error('Quota');
    },
  };
  assert.deepEqual(readTournaments(denied), { items: [], blocked: true });
  assert.equal(saveTournaments(denied, [complete()]), false);
});
