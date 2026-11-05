import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from '../game.ts';
import {
  advanceTournament,
  createTournament,
  matchStage,
  recordGame,
  startTurn,
  TournamentPhase,
} from './rules.ts';
import { readTournaments, saveTournament, TOURNAMENTS_KEY } from './storage.ts';
import { encodeTournament, decodeTournament } from './format.ts';

function complete(seed: number) {
  let state = createTournament(
    ['Ada', 'Bo', 'Cora', 'Dev'],
    [0, 1, 2].map((index) => `np1-${matchStage(4, index).size}-${seed + index}`),
  );
  while (state.phase !== TournamentPhase.complete) {
    state = startTurn(state);
    const code = state.matches[state.currentMatch]?.boardCode;
    assert.ok(code);
    let game = createGame(code);
    for (let face = 0; face < game.deck.length / 2; face += 1)
      for (let index = 0; index < game.deck.length; index += 1)
        if (game.deck[index] === face) game = activateCard(game, index);
    state = recordGame(state, { ...game, elapsedMs: 1.25 });
    if (state.phase !== TournamentPhase.complete) state = advanceTournament(state);
  }
  return state;
}

test('completed tournaments round trip with exact result precision and retain only the newest ten', () => {
  const values = new Map<string, string>();
  values.set('unrelated', 'keep');
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, text: string) => {
      values.set(key, text);
    },
  };
  let history = readTournaments(store);
  const first = complete(1);
  assert.equal(
    decodeTournament(encodeTournament(first)).state?.matches[0]?.results[0]?.elapsedMs,
    1.25,
  );
  for (let seed = 1; seed <= 11; seed += 1)
    history = saveTournament(store, history.items, complete(seed));
  assert.equal(history.items.length, 10);
  assert.equal(history.items[0]?.matches[0]?.boardCode, 'np1-6-11');
  assert.equal(history.items.at(-1)?.matches[0]?.boardCode, 'np1-6-2');
  assert.deepEqual(
    readTournaments(store).items.map(encodeTournament),
    history.items.map(encodeTournament),
  );
  assert.equal(values.get('unrelated'), 'keep');
  const envelope: unknown = JSON.parse(values.get(TOURNAMENTS_KEY) ?? 'null');
  assert.ok(envelope && typeof envelope === 'object');
  assert.deepEqual(Object.keys(envelope).sort(), ['items', 'v']);
  assert.equal('v' in envelope && envelope.v, 3);
});

test('corrupt history stays untouched on reads and blocked stores keep records in memory', () => {
  for (const text of [
    '{',
    '{"v":2,"items":[]}',
    '{"v":3,"items":[{}]}',
    '{"v":3,"items":[],"extra":0}',
  ]) {
    let writes = 0;
    const store = {
      getItem: () => text,
      setItem: () => {
        writes += 1;
      },
    };
    assert.deepEqual(readTournaments(store), { items: [], blocked: false });
    assert.equal(writes, 0);
  }
  const store = {
    getItem: (): string | null => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.equal(readTournaments(store).blocked, true);
  const saved = saveTournament(store, [], complete(1));
  assert.equal(saved.blocked, true);
  assert.equal(saved.items.length, 1);
});
