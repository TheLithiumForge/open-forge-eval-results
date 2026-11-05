import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  decodeTournament,
  encodeTournament,
  TOURNAMENT_FORMAT,
  TOURNAMENT_MAX_BYTES,
  TOURNAMENT_VERSION,
} from './format.ts';
import { startTournament } from './rules.ts';
import type { Tournament } from './rules.ts';

const PLAYERS = ['Ada', 'Bo', 'Cora', 'Dev'];
// A four-player event halfway through: both semifinals are played and the final is waiting.
const HALFWAY = {
  format: 'neon-pairs/tournament',
  matches: [
    {
      boardCode: 'np1-6-1',
      results: [
        { elapsedMs: 70200.5, moves: 20 },
        { elapsedMs: 58100, moves: 21 },
      ],
    },
    {
      boardCode: 'np1-6-2',
      results: [
        { elapsedMs: 65200, moves: 19 },
        { elapsedMs: 65900, moves: 19 },
      ],
    },
    { boardCode: 'np1-8-1', results: [null, null] },
  ],
  players: PLAYERS,
  reviewing: true,
  version: 1,
};

function accepted(value: unknown): Tournament {
  const read = decodeTournament(JSON.stringify(value));
  assert.ok(read && 'tournament' in read, JSON.stringify(value));
  return read.tournament;
}

interface Draft {
  readonly format: unknown;
  readonly matches: unknown[];
  readonly players: unknown;
  readonly reviewing: unknown;
  readonly version: unknown;
}

function rejected(change: (value: Draft) => unknown, why: string): void {
  const draft: Draft = structuredClone(HALFWAY);
  assert.equal(decodeTournament(JSON.stringify(change(draft))), null, why);
}

test('export writes the format name, a whole version and alphabetical keys at every level', () => {
  assert.equal(TOURNAMENT_FORMAT, 'neon-pairs/tournament');
  assert.ok(Number.isInteger(TOURNAMENT_VERSION));
  const text = encodeTournament(accepted(HALFWAY));
  assert.equal(text, JSON.stringify(HALFWAY, null, 2));
  const empty = JSON.parse(encodeTournament(startTournament([], [])));
  assert.deepEqual(Object.keys(empty), ['format', 'matches', 'players', 'reviewing', 'version']);
});

test('a decoded tournament round trips with fractional active time intact', () => {
  const tournament = accepted(HALFWAY);
  assert.equal(tournament.matches[0]?.results[0]?.elapsedMs, 70200.5);
  assert.deepEqual(accepted(JSON.parse(encodeTournament(tournament))), tournament);
  assert.deepEqual(accepted({ ...HALFWAY, players: [], matches: [], reviewing: false }), {
    players: [],
    matches: [],
    reviewing: false,
  });
});

test('the first field outside the format is named, in document order', () => {
  const named = (value: unknown) => decodeTournament(JSON.stringify(value));
  assert.deepEqual(named({ ...HALFWAY, note: 1 }), { unknownField: 'note' });
  const nested = structuredClone(HALFWAY);
  Object.assign(nested.matches[1] ?? {}, { winner: 'Bo' });
  assert.deepEqual(named({ ...nested, later: 1 }), { unknownField: 'winner' });
  const result = structuredClone(HALFWAY);
  Object.assign(result.matches[0]?.results[1] ?? {}, { seed: 4 });
  assert.deepEqual(named(result), { unknownField: 'seed' });
  assert.deepEqual(named({ ...HALFWAY, version: 2, extra: true }), { unknownField: 'extra' });
});

test('invalid tournaments are rejected without a field name', () => {
  assert.equal(decodeTournament('{'), null);
  assert.equal(decodeTournament('[]'), null);
  assert.equal(decodeTournament(' '.repeat(TOURNAMENT_MAX_BYTES + 1)), null);
  rejected((value) => ({ ...value, version: 2 }), 'unsupported version');
  rejected((value) => ({ ...value, version: '1' }), 'version must be a number');
  rejected((value) => ({ ...value, format: 'neon-pairs/snapshot' }), 'another format');
  rejected(({ reviewing: _, ...value }) => value, 'missing field');
  rejected((value) => ({ ...value, players: PLAYERS.slice(0, 3) }), 'three players');
  rejected((value) => ({ ...value, players: ['Ada', 'Bo', 'Cora', 'ada'] }), 'repeated name');
  rejected((value) => ({ ...value, players: ['Ada', 'Bo', 'Cora', ' Dev'] }), 'raw name');
  rejected((value) => ({ ...value, players: ['Ada', 'Bo', 'Cora', 'D'] }), 'short name');
  rejected((value) => {
    value.matches[1] = { ...HALFWAY.matches[1], boardCode: 'np1-6-1' };
    return value;
  }, 'two matches share a deal');
  rejected((value) => {
    value.matches[2] = { boardCode: 'np1-6-3', results: [null, null] };
    return value;
  }, 'the final plays 8x8');
  rejected((value) => {
    value.matches[0] = { boardCode: 'np1-6-1', results: [null, { elapsedMs: 1, moves: 18 }] };
    return value;
  }, 'results fill in play order');
  rejected((value) => {
    value.matches[0] = { boardCode: 'np1-6-1', results: [{ elapsedMs: 1, moves: 17 }, null] };
    return value;
  }, 'fewer moves than pairs');
  rejected((value) => {
    value.matches[0] = { boardCode: 'np1-6-1', results: [{ elapsedMs: -1, moves: 18 }, null] };
    return value;
  }, 'negative time');
  rejected(
    (value) => ({
      ...value,
      matches: HALFWAY.matches.map((match) => ({ ...match, results: [null, null] })),
    }),
    'nothing to review before the first game',
  );
});
