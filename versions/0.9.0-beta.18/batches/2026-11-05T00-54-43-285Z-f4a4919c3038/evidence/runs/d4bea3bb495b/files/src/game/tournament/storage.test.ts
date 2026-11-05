import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createTournament, advanceTournament } from './rules.ts';
import { finishTournamentTurn, TOURNAMENT_NAMES } from './tournament.fixture.ts';
import { readTournaments, retainTournament, TOURNAMENTS_KEY, writeTournaments } from './storage.ts';
import { TournamentPhase } from './model.ts';

function finished(seed: number) {
  let tournament = createTournament(TOURNAMENT_NAMES.slice(0, 4), seed);
  while (tournament.phase !== TournamentPhase.complete) {
    tournament = finishTournamentTurn(tournament);
    if (
      tournament.phase === TournamentPhase.turnComplete ||
      tournament.phase === TournamentPhase.matchComplete
    )
      tournament = advanceTournament(tournament);
  }
  return tournament;
}

test('finished history keeps newest ten unique tournaments in the version three envelope', () => {
  let items = [finished(1)];
  for (let seed = 2; seed <= 12; seed += 1) items = retainTournament(items, finished(seed));
  const values = new Map<string, string>([['unrelated', 'keep']]);
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  assert.equal(items.length, 10);
  assert.equal(retainTournament(items, items[0]!).length, 10);
  assert.deepEqual(writeTournaments(store, items), { blocked: false });
  const raw = JSON.parse(values.get(TOURNAMENTS_KEY)!);
  assert.deepEqual(Object.keys(raw).sort(), ['items', 'v']);
  assert.equal(raw.v, 3);
  assert.equal(values.get('unrelated'), 'keep');
  assert.deepEqual(
    readTournaments(store).items.map((event) => event.game.boardCode),
    items.map((event) => event.game.boardCode),
  );
});

test('corrupt reads are silent and nonmutating while denied reads and writes stay usable', () => {
  for (const text of [
    '{',
    '{"v":2,"items":[]}',
    '{"v":3,"items":[{}]}',
    '{"v":3,"items":[],"extra":1}',
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
  const denied = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
  assert.deepEqual(readTournaments(denied), { items: [], blocked: true });
  assert.deepEqual(writeTournaments(denied, [finished(1)]), { blocked: true });
  assert.deepEqual(readTournaments(null), { items: [], blocked: true });
});
