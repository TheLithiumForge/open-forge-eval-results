import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame } from '../game.ts';
import { decodeTournament, encodeTournament } from './tournament-format.ts';
import { advanceTournament, startTournamentTurn } from './tournament.ts';
import {
  exampleTournament,
  finishExampleTurn,
  finishExampleTournament,
} from './tournament.fixture.ts';
import { readPastTournaments, writePastTournaments, TOURNAMENTS_KEY } from './storage.ts';
import type { TournamentProgress } from './tournament.ts';

test('versioned exports round trip setup, every handoff, completed brackets and saved history', () => {
  const past = [finishExampleTournament(8).tournament];
  let active = exampleTournament();
  const phases: TournamentProgress[] = [active];
  active = startTournamentTurn(active);
  phases.push(active);
  active = finishExampleTurn(active);
  phases.push(active);
  active = advanceTournament(active, 'np1-4-100');
  phases.push(active);
  active = finishExampleTurn(active, 9);
  phases.push(active, finishExampleTournament());
  for (const progress of phases) {
    const workspace = { active: progress, past };
    assert.deepEqual(decodeTournament(encodeTournament(workspace)), workspace);
  }
  assert.deepEqual(decodeTournament(encodeTournament({ active: null, past })), {
    active: null,
    past,
  });
});

test('exported active turns preserve the clock before the first reveal and a pending mismatch', () => {
  const active = startTournamentTurn(exampleTournament());
  assert.ok(active.game);
  for (const game of [
    advanceGame(active.game, 1234),
    advanceGame(activateCard(activateCard(active.game, 0), 1), 275),
  ]) {
    const workspace = { active: { ...active, game }, past: [] };
    assert.deepEqual(decodeTournament(encodeTournament(workspace)), workspace);
  }
});

test('malformed imports reject invalid scores, future results, impossible phases and mismatched deals', () => {
  const initial = exampleTournament();
  const { tournament } = initial;
  const match = tournament.matches[0];
  assert.ok(match);
  const badRecords = [
    { ...tournament, players: ['A'] },
    { ...tournament, players: ['A', 'B', 'C', ' '] },
    { ...tournament, matches: [] },
    { ...tournament, createdAt: -1 },
    {
      ...tournament,
      matches: [{ ...match, boardCode: 'np1-5-1' }, ...tournament.matches.slice(1)],
    },
    {
      ...tournament,
      matches: [
        { ...match, results: [{ moves: 7, elapsedMs: 0 }] },
        ...tournament.matches.slice(1),
      ],
    },
    { ...tournament, matches: [match, { ...match, results: [{ moves: 8, elapsedMs: 0 }] }, match] },
    {
      ...tournament,
      matches: [
        { ...match, results: [{ moves: 8, elapsedMs: -1 }] },
        ...tournament.matches.slice(1),
      ],
    },
  ];
  for (const record of badRecords)
    assert.equal(
      decodeTournament(
        JSON.stringify({ version: 1, active: { ...initial, tournament: record }, past: [] }),
      ),
      null,
    );
  for (const patch of [
    { phase: 'complete' },
    { phase: 'playing' },
    { phase: 'turn-complete' },
    { phase: 'match-complete' },
    { phase: 'unknown' },
    { matchIndex: 1 },
    { game: { ...startTournamentTurn(initial).game, boardCode: 'np1-4-2' } },
  ])
    assert.equal(
      decodeTournament(JSON.stringify({ version: 1, active: { ...initial, ...patch }, past: [] })),
      null,
    );
  for (const text of ['{', 'null', '[]', '{}', '{"version":2,"active":null,"past":[]}'])
    assert.equal(decodeTournament(text), null);
  assert.equal(decodeTournament(encodeTournament({ active: null, past: [tournament] })), null);
  const complete = finishExampleTournament().tournament;
  assert.equal(
    decodeTournament(encodeTournament({ active: null, past: [complete, complete] })),
    null,
  );
});

test('finished tournaments persist together and blocked or malformed storage remains usable', () => {
  const entries = new Map<string, string>();
  const store = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  const past = [finishExampleTournament().tournament, finishExampleTournament(8).tournament];
  writePastTournaments(store, past);
  assert.deepEqual(readPastTournaments(store), past);
  entries.set(TOURNAMENTS_KEY, '{');
  assert.deepEqual(readPastTournaments(store), []);
  assert.deepEqual(readPastTournaments(null), []);
  const blocked = {
    getItem(): string | null {
      throw new Error('Blocked');
    },
    setItem(): void {
      throw new Error('Full');
    },
  };
  assert.deepEqual(readPastTournaments(blocked), []);
  assert.doesNotThrow(() => writePastTournaments(blocked, past));
});
