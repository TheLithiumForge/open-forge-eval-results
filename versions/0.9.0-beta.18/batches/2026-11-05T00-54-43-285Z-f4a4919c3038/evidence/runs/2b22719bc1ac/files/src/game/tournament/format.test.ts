import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { isJsonObject } from '../saved-format.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import { createTournament, finishTurn, nextTurn, startTurn } from './rules.ts';

const names = ['Ada', 'Bo', 'Cy', 'De'];
const initial = createTournament(names, ['np1-6-1', 'np1-6-2', 'np1-8-3']);

test('setup, handoff, and active snapshot documents round trip with alphabetical keys', () => {
  const playing = startTurn(initial);
  const done = finishTurn(playing, { moves: 18, elapsedMs: 1.25 });
  const states = [null, initial, playing, done, nextTurn(done)];
  for (const tournament of states) {
    const snapshot =
      tournament === playing ? encodeSnapshot(activateCard(createGame('np1-6-1'), 0)) : null;
    const data = { names, snapshot, tournament };
    const text = encodeTournament(data);
    assert.deepEqual(decodeTournament(text).data, data);
    function check(value: unknown): void {
      if (Array.isArray(value)) {
        value.forEach(check);
        return;
      }
      if (!isJsonObject(value)) return;
      assert.deepEqual(Object.keys(value), Object.keys(value).sort());
      Object.values(value).forEach(check);
    }
    const parsed: unknown = JSON.parse(text);
    check(parsed);
  }
});

test('unknown fields are identified at root, match, result, and snapshot boundaries', () => {
  const done = finishTurn(startTurn(initial), { moves: 18, elapsedMs: 0 });
  const base = {
    format: 'neon-pairs/tournament',
    version: 1,
    names,
    snapshot: null,
    tournament: done,
  };
  const match = done.matches[0];
  assert.ok(match);
  const variants = [
    { ...base, extra: 1 },
    {
      ...base,
      tournament: { ...done, matches: [{ ...match, extra: 1 }, ...done.matches.slice(1)] },
    },
    {
      ...base,
      tournament: {
        ...done,
        matches: [
          { ...match, results: [{ moves: 18, elapsedMs: 0, extra: 1 }] },
          ...done.matches.slice(1),
        ],
      },
    },
    {
      ...base,
      tournament: startTurn(initial),
      snapshot: {
        version: 1,
        boardCode: 'np1-6-1',
        matched: [],
        moves: 0,
        elapsedMs: 0,
        started: false,
        selection: { kind: 'closed', extra: 1 },
      },
    },
  ];
  for (const variant of variants)
    assert.equal(decodeTournament(JSON.stringify(variant)).error, 'Unknown field: extra.');
});

test('imports reject impossible winners, progress, scores, duplicate deals and malformed text', () => {
  const base = { names, snapshot: null, tournament: initial };
  for (const text of [
    '{',
    'null',
    encodeTournament(base).replace('"version": 1', '"version": 2'),
    ' '.repeat(65_537),
  ])
    assert.equal(decodeTournament(text).data, null);
  for (const tournament of [
    { ...initial, matchIndex: 1 },
    { ...initial, players: ['Ada', 'ADA', 'Cy', 'De'] },
    { ...initial, matches: initial.matches.map((m, i) => (i === 0 ? { ...m, winner: 0 } : m)) },
    {
      ...initial,
      matches: initial.matches.map((m, i) => (i === 1 ? { ...m, boardCode: 'np1-6-1' } : m)),
    },
    {
      ...initial,
      matches: initial.matches.map((m, i) =>
        i === 0 ? { ...m, results: [{ moves: 1, elapsedMs: 0 }] } : m,
      ),
    },
  ])
    assert.equal(decodeTournament(encodeTournament({ ...base, tournament })).data, null);
});
