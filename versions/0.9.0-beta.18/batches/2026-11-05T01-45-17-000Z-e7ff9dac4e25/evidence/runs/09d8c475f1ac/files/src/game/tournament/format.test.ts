import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import {
  decodeTournament,
  encodeTournament,
  readRecord,
  toRecord,
  TOURNAMENT_FORMAT,
  TOURNAMENT_MAX_BYTES,
  TOURNAMENT_VERSION,
  TournamentNotice,
  unknownFieldNotice,
} from './format.ts';
import { createTournament, dealSizes, nextTurn, recordResult } from './rules.ts';
import type { Tournament } from './rules.ts';

const PLAYERS = ['Ada', 'Bo', 'Cora', 'Dev'];
const CODES = dealSizes(4).map((size, index) => boardCode(size, index + 11));

// Plays the first turns of a four player tournament with valid 6x6 results.
function progressed(turns: number): Tournament {
  let tournament = createTournament(PLAYERS, CODES);
  for (let count = 0; count < turns; count += 1) {
    const turn = nextTurn(tournament);
    if (!turn) break;
    tournament = recordResult(tournament, turn, { moves: 30 + count, elapsedMs: 4000 + count });
  }
  return tournament;
}

function parsed(tournament: Tournament): Record<string, unknown> {
  const value: unknown = JSON.parse(encodeTournament(tournament));
  assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value));
  return { ...value };
}

function rejects(value: unknown, notice: string = TournamentNotice.invalid): void {
  assert.deepEqual(decodeTournament(JSON.stringify(value)), { ok: false, notice });
}

function sortedAtEveryLevel(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(sortedAtEveryLevel);
  if (typeof value !== 'object' || value === null) return true;
  const keys = Object.keys(value);
  return keys.join() === [...keys].sort().join() && Object.values(value).every(sortedAtEveryLevel);
}

test('an export names its format, a whole number version and sorted keys at every level', () => {
  const document = parsed(progressed(5));
  assert.equal(document.format, TOURNAMENT_FORMAT);
  assert.equal(document.version, 1);
  assert.equal(TOURNAMENT_VERSION, 1);
  assert.equal(sortedAtEveryLevel(document), true);
  assert.equal(encodeTournament(progressed(5)).includes('\n  "format"'), true);
});

test('a tournament survives export and load at every stage of play', () => {
  for (const turns of [0, 1, 2, 5, 6]) {
    const tournament = progressed(turns);
    assert.deepEqual(decodeTournament(encodeTournament(tournament)), { ok: true, tournament });
  }
});

test('a draft of the entry form loads with unfinished names', () => {
  const draft: Tournament = { players: ['Ada', '', 'C', 'Dev'], matches: [] };
  assert.deepEqual(decodeTournament(encodeTournament(draft)), { ok: true, tournament: draft });
  rejects({ ...parsed(draft), players: ['Ada', '', 'C'] });
});

test('names in a loaded tournament use the accepted representation and must be valid', () => {
  const loaded = decodeTournament(
    JSON.stringify({ ...parsed(progressed(0)), players: [' Ada  ', 'Bo', 'Cora', 'Dev'] }),
  );
  assert.deepEqual(loaded.ok && loaded.tournament.players, PLAYERS);
  rejects({ ...parsed(progressed(0)), players: ['Ada', 'ada', 'Cora', 'Dev'] });
  rejects({ ...parsed(progressed(0)), players: ['Ada', 'B', 'Cora', 'Dev'] });
});

test('the first field the format does not define is named', () => {
  const base = parsed(progressed(2));
  rejects({ ...base, extra: 1, other: 2 }, unknownFieldNotice('extra'));
  assert.equal(unknownFieldNotice('extra'), 'Unknown field: extra.');
  const matches = [...(Array.isArray(base.matches) ? base.matches : [])];
  matches[0] = { ...matches[0], note: 'x' };
  rejects({ ...base, matches }, unknownFieldNotice('note'));
  const results = [{ elapsedMs: 5, moves: 20, rank: 1 }, null];
  rejects({ ...base, matches: [{ code: CODES[0], results }] }, unknownFieldNotice('rank'));
});

test('text that is not a version one tournament is invalid', () => {
  const base = parsed(progressed(1));
  for (const bad of ['', '{', 'null', '[]', '"x"'])
    assert.deepEqual(decodeTournament(bad), { ok: false, notice: TournamentNotice.invalid });
  rejects({ ...base, format: 'neon-pairs/snapshot' });
  rejects({ ...base, version: 2 });
  rejects({ ...base, version: '1' });
  rejects({ matches: base.matches, players: base.players, version: 1 });
});

test('a tournament must keep its own board code for each match at the size of its stage', () => {
  const base = parsed(progressed(0));
  const make = (codes: string[]) => ({
    ...base,
    matches: codes.map((code) => ({ code, results: [null, null] })),
  });
  rejects(make(['np1-6-1', 'np1-6-1', 'np1-8-2']));
  rejects(make(['np1-4-1', 'np1-6-2', 'np1-8-3']));
  rejects(make(['np1-6-1', 'np1-6-2']));
  rejects(make(['np1-6-1', 'np1-6-2', 'np1-9-3']));
  assert.equal(decodeTournament(JSON.stringify(make(CODES))).ok, true);
});

test('results must be plausible and follow the order of play', () => {
  const base = parsed(progressed(0));
  const withResults = (...results: unknown[][]) => ({
    ...base,
    matches: CODES.map((code, index) => ({ code, results: results[index] ?? [null, null] })),
  });
  const good = { elapsedMs: 4000, moves: 30 };
  assert.equal(decodeTournament(JSON.stringify(withResults([good, null]))).ok, true);
  rejects(withResults([null, good]));
  rejects(withResults([good, null], [good, null]));
  rejects(withResults([{ ...good, moves: 17 }, null]));
  rejects(withResults([{ ...good, moves: 1.5 }, null]));
  rejects(withResults([{ ...good, elapsedMs: -1 }, null]));
  rejects(withResults([{ ...good, elapsedMs: 360_000_000 }, null]));
  rejects(withResults([{ ...good, elapsedMs: '4000' }, null]));
});

test('text beyond the byte limit is rejected before it is parsed', () => {
  const padded = `${encodeTournament(progressed(0))}${' '.repeat(TOURNAMENT_MAX_BYTES)}`;
  assert.deepEqual(decodeTournament(padded), { ok: false, notice: TournamentNotice.invalid });
});

test('a stored record has exactly its matches and players', () => {
  const finished = progressed(6);
  assert.deepEqual(readRecord(toRecord(finished)), finished);
  assert.equal(readRecord({ ...toRecord(finished), extra: 1 }), null);
  assert.equal(readRecord({ players: finished.players }), null);
  assert.equal(readRecord(null), null);
});
