import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import {
  decodeTournament,
  encodeTournament,
  TOURNAMENT_FORMAT,
  TOURNAMENT_VERSION,
  TournamentLoad,
} from './format.ts';
import { createTournament, recordResult } from './rules.ts';
import { countingDraw, EIGHT, finishedTournament, FOUR } from './tournament.fixture.ts';
import type { Tournament } from './rules.ts';

function edited(
  change: (value: Record<string, unknown>) => void,
  tournament: Tournament = finishedTournament(),
): string {
  const value: unknown = JSON.parse(encodeTournament(tournament));
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Object');
  const root = Object.fromEntries(Object.entries(value));
  change(root);
  return JSON.stringify(root);
}

function keysInOrder(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(keysInOrder);
  if (typeof value !== 'object' || value === null) return true;
  const keys = Object.keys(value);
  return (
    keys.join() === [...keys].sort().join() &&
    Object.values(value).every((item) => keysInOrder(item))
  );
}

test('an export names its format and version with alphabetical keys at every level', () => {
  const text = encodeTournament(finishedTournament(EIGHT));
  const value: unknown = JSON.parse(text);
  assert.ok(typeof value === 'object' && value !== null);
  assert.deepEqual(Object.keys(value), ['format', 'players', 'rounds', 'version']);
  assert.ok('format' in value && value.format === TOURNAMENT_FORMAT);
  assert.equal(TOURNAMENT_FORMAT, 'neon-pairs/tournament');
  assert.ok('version' in value && value.version === TOURNAMENT_VERSION);
  assert.ok(keysInOrder(value));
});

test('finished and unfinished tournaments load back exactly, fractional time included', () => {
  const draw = countingDraw();
  const started = recordResult(
    createTournament(FOUR, draw),
    { moves: 21, elapsedMs: 4321.75 },
    draw,
  );
  for (const tournament of [started, createTournament(EIGHT, draw), finishedTournament(EIGHT)])
    assert.deepEqual(decodeTournament(encodeTournament(tournament)), tournament);
});

test('the first field the format does not define is named, in document order', () => {
  assert.equal(
    decodeTournament(edited((root) => Object.assign(root, { notes: 1, extra: 2 }))),
    'Unknown field: notes.',
  );
  const nested = edited((root) => {
    const text = JSON.stringify(root.rounds).replace('"boardCode"', '"seed":1,"boardCode"');
    root.rounds = JSON.parse(text);
    root.later = true;
  });
  assert.equal(decodeTournament(nested), 'Unknown field: seed.');
  const attempt = edited((root) => {
    root.rounds = JSON.parse(JSON.stringify(root.rounds).replace('"moves"', '"moves":40,"score"'));
  });
  assert.equal(decodeTournament(attempt), 'Unknown field: score.');
});

test('a tournament that breaks its own rules is refused', () => {
  const refused = [
    '{',
    'null',
    edited((root) => (root.version = 2)),
    edited((root) => (root.format = 'neon-pairs/snapshot')),
    edited((root) => delete root.rounds),
    edited((root) => (root.players = ['Ada', 'Bo', 'Cora'])),
    edited((root) => (root.players = ['Ada', 'Bo', 'Cora', 'ada'])),
    edited((root) => (root.players = [' Ada', 'Bo', 'Cora', 'Dev'])),
    edited((root) => (root.rounds = [])),
    edited((root) => Array.isArray(root.rounds) && root.rounds.pop()),
  ];
  for (const text of refused) assert.equal(decodeTournament(text), TournamentLoad.invalid, text);
});

test('each match must hold the bracket players, a fresh deal of the right size and ordered turns', () => {
  const change = (from: string, to: string) =>
    decodeTournament(
      edited((root) => (root.rounds = JSON.parse(JSON.stringify(root.rounds).replace(from, to)))),
    );
  const codes = finishedTournament()
    .rounds.flat()
    .map((match) => match.boardCode);
  assert.equal(change(codes[1] ?? '', codes[0] ?? ''), TournamentLoad.invalid);
  assert.equal(change(codes[0] ?? '', boardCode(4, 99)), TournamentLoad.invalid);
  assert.equal(change('"Ada","Dev"', '"Dev","Ada"'), TournamentLoad.invalid);
  assert.equal(change('"moves":40', '"moves":17'), TournamentLoad.invalid);
  assert.equal(change('"moves":40', '"moves":40.5'), TournamentLoad.invalid);
  assert.equal(change('"elapsedMs":1000.5', '"elapsedMs":-1'), TournamentLoad.invalid);
  const open = createTournament(FOUR, countingDraw());
  const turns = (pattern: RegExp, replacement: string) =>
    decodeTournament(
      edited((root) => {
        root.rounds = JSON.parse(JSON.stringify(root.rounds).replace(pattern, replacement));
      }, open),
    );
  const attempt = '{"elapsedMs":1,"moves":18}';
  assert.equal(turns(/("Cora"\],"results":\[)null/, `$1${attempt}`), TournamentLoad.invalid);
  assert.equal(turns(/("Dev"\],"results":\[null,)null/, `$1${attempt}`), TournamentLoad.invalid);
  assert.notEqual(turns(/("Dev"\],"results":\[)null/, `$1${attempt}`), TournamentLoad.invalid);
});
