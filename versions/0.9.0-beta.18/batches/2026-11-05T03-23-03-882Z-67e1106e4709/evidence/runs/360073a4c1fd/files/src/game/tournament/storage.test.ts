import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createTournament, TournamentPhase } from './rules.ts';
import { readTournaments, retainTournament, TOURNAMENTS_KEY, writeTournaments } from './storage.ts';
import type { Tournament } from './rules.ts';

function completed(seed: number): Tournament {
  const initial = createTournament(
    ['Ada', 'Bo', 'Cora', 'Dev'],
    [`np1-6-${seed}`, `np1-6-${seed + 1}`, `np1-8-${seed}`],
  );
  return {
    ...initial,
    phase: TournamentPhase.complete,
    matchIndex: 2,
    matches: initial.matches.map((match, index) => ({
      ...match,
      results: [
        { moves: index === 2 ? 32 : 18, elapsedMs: 100.5 },
        { moves: index === 2 ? 33 : 19, elapsedMs: 100 },
      ],
    })),
  };
}

test('finished tournaments retain the newest ten, round trip and leave unrelated storage alone', () => {
  const data = new Map([['unrelated', 'keep']]);
  const store = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  let items: readonly Tournament[] = [];
  for (let seed = 1; seed <= 12; seed++) items = retainTournament(items, completed(seed));
  assert.equal(items.length, 10);
  assert.equal(items[0]?.matches[0]?.boardCode, 'np1-6-12');
  assert.equal(items[9]?.matches[0]?.boardCode, 'np1-6-3');
  assert.deepEqual(writeTournaments(store, items), { available: true });
  assert.deepEqual(readTournaments(store), { items, available: true });
  assert.equal(data.get('unrelated'), 'keep');
  const envelope: unknown = JSON.parse(data.get(TOURNAMENTS_KEY) ?? 'null');
  assert.ok(envelope && typeof envelope === 'object' && 'v' in envelope && envelope.v === 3);
  assert.deepEqual(Object.keys(envelope).sort(), ['items', 'v']);
  assert.equal(retainTournament(items, completed(12)).length, 10);
});

test('corrupt records read as empty without changing their string and blocked stores preserve play', () => {
  for (const text of ['{', '{"v":2,"items":[]}', '{"v":3,"items":[{}]}']) {
    let saved = text;
    const store = {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    };
    assert.deepEqual(readTournaments(store), { items: [], available: true });
    assert.equal(saved, text);
    writeTournaments(store, [completed(1)]);
    assert.notEqual(saved, text);
  }
  const blocked = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.deepEqual(readTournaments(blocked), { items: [], available: false });
  assert.deepEqual(writeTournaments(blocked, [completed(1)]), { available: false });
  assert.deepEqual(readTournaments(null), { items: [], available: false });
});
